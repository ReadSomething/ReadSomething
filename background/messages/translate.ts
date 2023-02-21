import type { PlasmoMessaging } from "@plasmohq/messaging";

const handler: PlasmoMessaging.MessageHandler<{ message: string }> = async (req, res) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "prompt": "Translate to Chinese, returns the HTML tags in the original text:\n" + req.body
    });

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
    };

    await fetch("https://readsomething.xyz/v1/gpt3", requestOptions)
        .then(response => response.text())
        .then(result => {
            res.send({
                message: result
            })
        })
        .catch(_ => {
            res.send({
                message: null
            })
        })

};

export default handler;
