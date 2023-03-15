import type { PlasmoMessaging } from "@plasmohq/messaging";
import { ChatCompletionRequestMessageRoleEnum } from "openai";

const handler: PlasmoMessaging.MessageHandler<{ message: string }> = async (req, res) => {

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "Bearer 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");

    const raw = JSON.stringify({
        "model": "gpt-3.5-turbo",
        "stream": true,
        "messages": [
            {
                role: ChatCompletionRequestMessageRoleEnum.System,
                content: `Please generate a Chinese summary of the following text and generate three questions and short answer for read this article, question and answer start withs Q: and A:, return html with the following template
<div class="summary-qa">
  <p>Hey! Welcome here, This is your Reading Assistant~ The main content of this article is as follows:</p>
  <p>Summary Contents</p>
  <p>And there some important information and resources maybe helpful for your reading:</p>
  <div>
    <p>Question</p>
    <p>Answer</p>
  </div>
</div>:`
            },
            {
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: req.body
            }
        ]
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    // @ts-ignore
    fetch("https://api.openai.com/v1/chat/completions", requestOptions)
        .then(response => {
            const stream = response.body;
            const reader = stream.getReader();

            // read from the stream
            function readStream () {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log("Stream ended");

                        return;
                    }

                    console.log(value);
                    const enc = new TextDecoder("utf-8");
                    const str = enc.decode(value.buffer);

                    let message = "";
                    str.split("\n").forEach(line => {
                        console.log(line)
                        let text = line.replace("data: ", "").replace("\n", "");
                        console.log(text);

                        if (text !== "" && text !== "[DONE]") {
                            const payload = JSON.parse(text);
                            message += payload.choices[0].delta.content;
                        }
                    });

                    console.log(req.sender.tab.id, message)
                    chrome.runtime.sendMessage({
                        tabId: req.sender.tab.id,
                        message: message
                    })

                    // read the next chunk
                    readStream();
                });
            }

            readStream();
            console.log(req.sender.tab.id)

            chrome.runtime.sendMessage({
                tabId: req.sender.tab.id,
                message: {
                    message: "Please wait for a moment, the translation is in progress."
                }
            })

        })
        .catch(error => console.log("error", error));

};

export default handler;
