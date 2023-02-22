import type { PlasmoMessaging } from "@plasmohq/messaging";

const handler: PlasmoMessaging.MessageHandler<{ message: string }> = async (req, res) => {
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
    await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=zh-CN&q=" + encodeURIComponent(req.body), requestOptions)
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
