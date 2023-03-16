import { ReactNode, createContext, useState } from "react"

export class Article {
    title: string

    constructor (title: string) {
        this.title = title
    }
}

interface TypeReaderContext {
    settingStatus: boolean
    setSettingStatus: (value: boolean) => void

    article: Article

    setArticle: (article: Article) => void

    translateOn: boolean

    setTranslateOn: (on: boolean) => void
}

export const ReaderContext = createContext({} as TypeReaderContext)

export function ReaderProvider ({
    children,
    article
}: {
    children: ReactNode
    article: Article
}) {
    const [settingStatus, setSettingStatus] = useState(false)
    const [_article, setArticle] = useState(article)
    const [translateOn, setTranslateOn] = useState(false)

    return (
        <ReaderContext.Provider
            value={{
                settingStatus,
                setSettingStatus,
                article: _article,
                setArticle,
                translateOn,
                setTranslateOn,
            }}>
            {children}
        </ReaderContext.Provider>
    )
}
