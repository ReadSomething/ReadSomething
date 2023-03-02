import type { PlasmoMessaging } from "@plasmohq/messaging";
import { Configuration, OpenAIApi } from "openai";
import fetchAdapter from "@vespaiach/axios-fetch-adapter";

const handler: PlasmoMessaging.MessageHandler<{ message: string }> = async (req, res) => {
    const configuration = new Configuration({
        apiKey: "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"
    });
    const openai = new OpenAIApi(configuration);

    await openai.createCompletion({
        model: "text-davinci-003",
        prompt: "Translate to Simplified Chinese, returns the HTML tags in the original text:\n\n" + req.body,
        temperature: 0.7,
        max_tokens: 60,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 1
    }, { adapter: fetchAdapter }).then(resp => {
        console.log(resp);
        res.send({
            message: `{"data": ${JSON.stringify(resp.data.choices[0].text)}}`
        });
    }).catch(err => {
        console.log(err);
        res.send({
            message: `{"data": ${JSON.stringify("<p>Translation failed.</p>")}}`
        });
    });
};

export default handler;
