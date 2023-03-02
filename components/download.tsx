import html2md from "html-to-md";
import React, { useContext } from "react";
import IconDownload from "react:~/assets/download.svg";

import { ReaderContext } from "~provider/reader";
import Tooltip from "./tooltip";

export function DownloadMarkdown () {
    const {
        article: { title }
    } = useContext(ReaderContext);

    const getFileName = function () {
        return (
            (title ?? "download")
                .toLowerCase()
                .replaceAll(" ", "-")
                .replace(/-+/g, "-") + ".md"
        );
    };

    const download = function () {
        const plasmoRoot = document.querySelectorAll("plasmo-csui")[0].shadowRoot;
        const plasmoContainer = plasmoRoot.querySelector("#plasmo-shadow-container");
        const html = plasmoContainer.innerHTML;
        const md = html2md(html);

        const element = document.createElement("a");
        element.setAttribute(
            "href",
            "data:text/plain;charset=utf-8," + encodeURIComponent(md)
        );
        element.setAttribute("download", getFileName());

        element.style.display = "none";

        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };

    return (
        <div onClick={download} className={"setting select-none"}>
            <Tooltip message={"Export"}>
                <button className={"outline-none"}>
                    <IconDownload />
                </button>
            </Tooltip>
        </div>
    );
}
