function getTeamcity()
{
    var teamcity = "https://teamcity.vvvv.org";
    var proxy = "https://api.codetabs.com/v1/proxy?quest=";
    
    //return proxy + teamcity;
    return teamcity;
}

function getBuildsLink(buildType)
{
    return getTeamcity() + `/guestAuth/app/rest/builds?locator=branch:name:%3Cdefault%3E,buildType:${buildType},status:SUCCESS,state:finished&count=3`;
}

var tip = tippy('#previewButton', {
    content: 'Loading...',
    placement:'right',
    arrow:true,
    trigger:'click',
    animation: 'fade',
    allowHTML: true,
    hideOnClick: true,
    interactive: true,
    maxWidth: 'none',
    duration: [200, 0],
    onCreate(instance) {
        instance._isLoaded = false;
      },

    onShow(instance) {
        if (!instance._isLoaded)
        {
            const currentPreviewBuildType = instance.reference.getAttribute("data-currentPreviewBuildType");
            const currentPreviewTitle = instance.reference.getAttribute("data-currentPreviewTitle");
            const nextPreviewbuildType = instance.reference.getAttribute("data-nextPreviewBuildType");
            const nextPreviewTitle = instance.reference.getAttribute("data-nextPreviewTitle");
            
            Promise.allSettled([getLatestBuild(currentPreviewBuildType), getLatestBuild(nextPreviewbuildType)])
            .then((result) => {
                
                var div=`
                <div class="row">
                    <div class="col mx-0 mb-4">
                        <h3>${currentPreviewTitle}</h3> 
                        ${result[0].value}
                    </div>
                    <div class="col mx-0">
                        <h3>${nextPreviewTitle}</h3> 
                        ${result[1].value}
                    </div>
                </div>
                `;
                
                document.getElementById('gammaPreviews').innerHTML = div;
                var content = document.getElementById('previewDownloadTemplate').innerHTML;

                instance.setContent(content);
                instance._isLoaded = true;
                var closeButton = instance.popper.getElementsByClassName('close')[0];
                closeButton.onclick = function() {
                    instance.hide();
                }
                
            });
        }
      },
  });

async function getLatestBuild(buildType)
{
    var previews = [];

    var previews = await fetchData(getBuildsLink(buildType));

    var div="<table>";

    if (previews.length > 0)
    {
        for (var preview of previews)
        {
            div +=`<tr>  
                <td><a href="${getTeamcity()}${preview.link}" class="btn btn-secondary previewButton" onclick="plausible('downloadPreview')">${preview.buildNumber}</a></td>
                <td class="date">${preview.date}<br><a href="${preview.changesLink}" target="_blank" class="changes">Changes</a></td>
            </tr>`; 
        }
    }
    else
    {
        div += "<p>No builds available.</p>";
    }

    div+="</table>";

    return div;
}

async function fetchData(link)
{
    var previews = []
    var versionPattern = /\d*\.(.*?)\+/;

    var builds = await fetch(link)
    .then(response => response.text())
    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    .then(data => {
        return data.getElementsByTagName("build");      
    })

    for (var build of builds) {
        
        var buildNumber = build.getAttribute("number");
        var id = build.getAttribute ("id");
        var href = build.getAttribute ("href");

        if (href != null)
        {
            await fetch(getTeamcity() + href + "/artifacts/children")
            .then(response => response.text())
            .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
            .then(data => {
                var file = data.querySelector('file content[href$=".exe"]');
                var stamp = data.querySelector('file[modificationTime]').getAttribute('modificationTime');           

                if (file != null)
                {
                    var exeLink = file.getAttribute('href');

                    if (exeLink != null)
                    {
                        var shortNumber = buildNumber.match(versionPattern)[1];
                        var changes = getTeamcity()+`/viewLog.html?buildId=${id}&tab=buildChangesDiv&user=guest`;
                        previews.push ({link: exeLink, buildNumber: shortNumber, changesLink: changes, date: getDate(stamp)});
                    }
                }   
            })
        }
    }

    return previews;
}

function getDate(stamp)
{
    var yyyy = stamp.substring(0,4);
    var mm = stamp.substring(4,6);
    var dd = stamp.substring(6,8);
    var H = stamp.substring(9,11);
    var M = stamp.substring(11,13);
                
    return `${dd}.${mm}.${yyyy} ${H}:${M}`;
}


