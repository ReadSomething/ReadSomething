
import type { PlasmoMessaging } from "@plasmohq/messaging";

const ClientKey = btoa(
    "transmart_crx_" + navigator.userAgent
).slice(0, 100);

const detectLanguage = async function (text: string) {
    const body = {
        "header": {
            "fn": "text_analysis",
            "client_key": ClientKey
        },
        "text": text
    }

    const request = await fetch("https://transmart.qq.com/api/imt", {
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": JSON.stringify(body),
        "method": "POST"
    });

    const res = await request.json()

    return res?.language ?? 'en'
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const language = await detectLanguage(req.body as string)

    const body = {
        "header": {
            "fn": "auto_translation_block",
            "client_key": ClientKey
        },
        "source": {
            "text_block": req.body,
            "lang": language,
            // "orig_url": "https://adaafd8d683312381e0216c0616dd2a31052582acb1d584b9d737be00c513acb.com/15bacc70f4e905095fb01914c2628d35115b3e7f3145d77e3e73bae66cfe70da"
        },
        "target": {
            "lang": "zh"
        }
    }

    fetch("https://transmart.qq.com/api/imt", {
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": JSON.stringify(body),
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    }).then(response => response.json())
        .then(result => {
            res.send({
                message: JSON.stringify({
                    data: result.auto_translation
                })
            });
        })
        .catch(_ => {
            res.send({
                message: null
            });
        });
};

export default handler;
