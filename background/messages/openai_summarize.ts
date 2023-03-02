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
        prompt: `Please generate a Chinese summary of the following text and generate five questions and short answer for read this article, question and answer start withs Q: and A:, return html with the following template <div clss="summary-qa">
      <h2>Summary</h2>
      <p>__SUMMARY__</p>

      <div>
        <h2>Question-Answer</h2>
        <p>Question</p>
        <p>Answer</p>
      </div>
    </div>:\n\n"${req.body}"`,
        temperature: 0.1,
        max_tokens: 2500,
        top_p: 1.0,
        presence_penalty: 1.0,
    }, { adapter: fetchAdapter }).then(result => {
        console.log(result)
        res.send({
            message: result.data.choices[0].text
        });
    }).catch(_ => {
        res.send({
            message: null
        });
    });

};

export default handler;
