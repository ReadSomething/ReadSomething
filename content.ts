import {Readability} from "@mozilla/readability";

function ReadMode() {
    const documentClone = document.cloneNode(true);
    const article = new Readability(<Document>documentClone).parse();
    console.log(article.title)
    console.log(article.byline)
    console.log(article.excerpt)
    console.log(article.dir)
    console.log(article.content)
    console.log(article.textContent)
}

export default ReadMode
