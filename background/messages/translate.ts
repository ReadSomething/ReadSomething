import type { PlasmoMessaging } from "@plasmohq/messaging";
// import { translate } from '@vitalets/google-translate-api';

const handler: PlasmoMessaging.MessageHandler<{ message: string }> = async (req, res) => {
    // const myHeaders = new Headers();
    // myHeaders.append("Content-Type", "application/json");
    //
    // const raw = JSON.stringify({
    //     "prompt": "Translate to Simplified Chinese, returns the HTML tags in the original text:\n" + req.body
    // });
    //
    // const requestOptions = {
    //     method: 'POST',
    //     headers: myHeaders,
    //     body: raw,
    // };

    // await fetch("https://readsomething.xyz/v1/gpt3", requestOptions)
    //     .then(response => response.text())
    //     .then(result => {
    //         res.send({
    //             message: result
    //         })
    //     })
    //     .catch(_ => {
    //         res.send({
    //             message: null
    //         })
    //     })

    const myHeaders = new Headers();
    myHeaders.append("authority", "translate.googleapis.com");
    myHeaders.append("sec-fetch-dest", "empty");
    myHeaders.append("sec-fetch-mode", "cors");
    myHeaders.append("sec-fetch-site", "none");
    myHeaders.append("x-client-data", "CJW2yQEIpLbJAQjBtskBCKmdygEI3tPKAQi4+8oBCJKhywEInP7MAQjwgM0B");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    // @ts-ignore
    fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=zh-CN&q=" + encodeURIComponent(req.body), requestOptions)
        .then(response => response.json())
        .then(result => {
            const data = result[0].map((item) => item[0]).filter(Boolean).join("")
            res.send({
                message: `{"data": ${JSON.stringify(data)}}`
            });
        })
        .catch(_ => {
            res.send({
                message: null
            });
        });
};

export default handler;
