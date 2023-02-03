import {Readability} from "@mozilla/readability";
import $ from "jquery";
import {useEffect, useState} from "react";
import styleText from "data-text:./content.scss"
import type { PlasmoGetStyle } from "plasmo"

export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style")
    style.textContent = styleText
    return style
}
// console.log(style)
// export const getStyle: PlasmoGetStyle = () => {
//     const style = document.createElement("style")
//     style.textContent = styleText
//     return style
// }


// function ReadMode() {
//     launch()
// }
//
// var latest_url;
//
// export function launch() {
//     if (document.getElementById("cr-iframe") == null) {
//         // Create iframe and append to body
//         var iframe: HTMLElement = createIframe();
//         document.body.appendChild(iframe);
//
//         latest_url = window.location.href;
//         init();
//     } else {
//         iframe = document.getElementById("cr-iframe");
//         if ($(iframe).is(':visible')) {
//             $(iframe).fadeOut();
//         } else {
//             // Only parse the article if the url was changed
//             if (latest_url == window.location) {
//                 $(iframe).fadeIn();
//             } else {
//                 latest_url = window.location.href;
//                 init();
//             }
//         }
//     }
// }
//
// function init() {
//     // Initialize iframe & doc
//     var iframe = document.getElementById('cr-iframe');
//
//     // Get parsed article
//     const documentClone = document.cloneNode(true);
//     const article = new Readability(documentClone as Document).parse();
//
//     var title = article.title;
//     var content = article.content;
//
//     var article_url = window.location.href;
//     if (article.byline == null) {
//         var author = "Unknown author";
//     } else {
//         var author = article.byline;
//     }
//     console.log(content)
//
//     iframe.innerHTML = content
//
// }
//
// // Create iframe
// function createIframe() {
//     var iframe = document.createElement('div');
//     iframe.id = "cr-iframe";
//     iframe.style.height = "100%";
//     iframe.style.width = "100%";
//     iframe.style.position = "fixed";
//     iframe.style.top = "0px";
//     iframe.style.right = "0px";
//     iframe.style.zIndex = "9000000000000000000";
//     iframe.style.backgroundColor = "#fff";
//
//     return iframe;
// }
//
// chrome.runtime.onMessage.addListener(
//     function (request) {
//         console.log('received')
//         // chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
//             launch()
//         // })
//     }
// )
//
//
// // launch()
// // export default ReadMode

const Reader = () => {
    const [showReader, setShowReader] = useState(false);

    const messageListen = function () {
        setShowReader(prevState => {
            return !prevState
        });
    }

    const keyUp = function (e) {
        if (e.key == "Escape") {
            setShowReader(false)
        }
    }

    useEffect(() => {
        chrome.runtime.onMessage.addListener(messageListen)
        document.body.addEventListener('keyup', keyUp);

        return function () {
            chrome.runtime.onMessage.removeListener(messageListen)
            document.body.removeEventListener('keyup', keyUp);
        }
    }, []);

    if(!showReader) return null

    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone as Document).parse();
    const article_url = window.location.href;
    const author = article.byline ?? "Unknown author"
    const estimatedReadTime = Math.max(Math.round(article.length / 1000), 1)
    const estimatedReadTimeStr = `${estimatedReadTime} ${estimatedReadTime > 1 ? 'minutes' :  'minute'} read`
    const domain = window.location.hostname

    // @ts-ignore
    return  <div style={{"--font-size": "20px", "--content-width": "30em"}}  className={'ReadSomething dark sans-serif loaded'}>
      <div style={{position: 'fixed', height: '100%', width: "100%", overflow: 'scroll', left: 0, top: 0, backgroundColor: "var(--main-background)"}}>
          <div className={'container'} >
              <div className="header reader-header reader-show-element">
                  <a className="domain reader-domain"
                     href={article_url}>{domain}</a>
                  <div className="domain-border"></div>
                  <h1 className="reader-title">{article.title}</h1>
                  <div className="credits reader-credits">{author}</div>
                  <div className="meta-data">
                      <div className="reader-estimated-time" data-l10n-id="about-reader-estimated-read-time"
                           data-l10n-args="{&quot;range&quot;:&quot;3–4&quot;,&quot;rangePlural&quot;:&quot;other&quot;}"
                           dir="ltr">{estimatedReadTimeStr}
                      </div>
                  </div>
              </div>
              <hr/>
              <div className={'content'}>
                  <div className={`mozReaderContent readerShowElement`}>
                      <div className='page' dangerouslySetInnerHTML={{__html: article.content}}/>
                  </div>
              </div>
          </div>
      </div>
    </div>
}

export default Reader
