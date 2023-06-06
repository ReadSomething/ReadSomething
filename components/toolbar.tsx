import React from "react";
import Translate from "~components/translate";
import { DownloadMarkdown } from "~components/download";
import { BasicSetting } from "~components/setting";
import OpenAI from "~components/openai";

function Toolbar () {
    return (
        <div className="fixed select-none right-[2%] top-[30px]">
            <div className="flex justify-end">
                <OpenAI />
                <Translate />
                <DownloadMarkdown />
                <BasicSetting />
            </div>
        </div>
    );
}

export default Toolbar;
