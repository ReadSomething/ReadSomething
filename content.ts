import {Readability} from "@mozilla/readability";
import $ from "jquery";

function ReadMode() {
    launch()
}

var latest_url;

function launch() {
    if (document.getElementById("cr-iframe") == null) {
        // Create iframe and append to body
        var iframe: HTMLElement = createIframe();
        document.body.appendChild(iframe);

        latest_url = window.location.href;
        init();
    } else {
        iframe = document.getElementById("cr-iframe");
        if ($(iframe).is(':visible')) {
            $(iframe).fadeOut();
        } else {
            // Only parse the article if the url was changed
            if (latest_url == window.location) {
                $(iframe).fadeIn();
            } else {
                latest_url = window.location.href;
                init();
            }
        }
    }
}

function init() {
    // Initialize iframe & doc
    var iframe = document.getElementById('cr-iframe');

    // Get parsed article
    const documentClone = document.cloneNode(true);
    const article = new Readability(<Document>documentClone).parse();

    var title = article.title;
    var content = article.content;

    var article_url = window.location.href;
    if (article.byline == null) {
        var author = "Unknown author";
    } else {
        var author = article.byline;
    }
    console.log(content)

    iframe.innerHTML = content

}

// Create iframe
function createIframe() {
    var iframe = document.createElement('div');
    iframe.id = "cr-iframe";
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    iframe.style.position = "fixed";
    iframe.style.top = "0px";
    iframe.style.right = "0px";
    iframe.style.zIndex = "9000000000000000000";
    iframe.style.backgroundColor = "#fff";

    return iframe;
}


export default ReadMode
