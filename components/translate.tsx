import React from "react";
import IconTranslate from "react:~/assets/translate.svg";
import { sendToBackground } from "@plasmohq/messaging"


export function Translate() {

  const translate = async function() {
    const plasmoRoot = document.querySelectorAll("plasmo-csui")[0].shadowRoot;
    const plasmoContainer = plasmoRoot.querySelector("#plasmo-shadow-container");
    const paragraphs = plasmoContainer.querySelectorAll("p");

    for (let i = 0; i < paragraphs.length; i++) {
      const item = paragraphs[i];
      const message = await sendToBackground({
        name: "translate",
        body: item.outerHTML
      })
      const resp = JSON.parse(message.message)
      console.log(resp)
      const div = createElementFromHTML(resp["data"]);
      item.after(div);
    }

  };

  async function requestGPT(requestOptions: { headers: Headers; method: string; body: string }, item: HTMLParagraphElement, tryTimes: number) {
    console.log(`tryTimes: ${tryTimes}`);

    return new Promise((resolve, reject) => {
      fetch("https://readsomething.xyz/v1/gpt3/translate", requestOptions)
        .then(response => response.json())
        .then(result => {
          resolve(result)
          // console.log(item.childNodes);
        })
        .catch(err => {
          console.log(err);
          reject(err)
          requestGPT(requestOptions, item, tryTimes++);
        });
    })
  }

  function createElementFromHTML(htmlString) {
    const div = document.createElement("div");
    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes.
    return div;
  }

  // @ts-ignore
  return (
    <div onClick={translate} className={"setting fixed select-none right-[130px] top-[30px] select-none"}
         title={"Translate"}>
      <div>
        <button className={"outline-none"}>
          <IconTranslate />
        </button>
      </div>
    </div>
  );
}
