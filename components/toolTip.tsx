import type {MouseEvent, ReactNode} from "react";
import {useEffect, useRef, useState} from "react";
import {Transition} from "@headlessui/react";

interface ToolTip {
    children: ReactNode,
    maxWidth?: number,
    message: string,
    // The delay (in ms) before showing the tooltip, default is 1000
    delayShow?: number
}

export default function ToolTip({
                                    children,
                                    maxWidth,
                                    message,
                                    delayShow
                                }: ToolTip) {

    const _maxWidth = maxWidth ?? 'max-content'
    const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout>(null);
    const [showContent, setShowContent] = useState(false);


    function contentMouseOver(e: MouseEvent<HTMLDivElement>) {
        e.stopPropagation()

        const timeout = setTimeout(() => {
            setShowContent(true)
        }, delayShow ?? 1000)

        setHoverTimer(timeout)
    }

    function contentMouseLeave() {
        setShowContent(false)

        setHoverTimer(prevState => {
            console.log('-------111--------------')
            clearTimeout(prevState)

            return null
        })
    }

    return <div className={'relative tooltip'}>
        <div className={'tooltip-content'} onMouseLeave={contentMouseLeave}
             onMouseOver={contentMouseOver}>{children}</div>
        <Transition
            show={showContent}
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
        >
            <div style={{maxWidth: _maxWidth}}
                 className={'tip absolute w-fit left-[-9999px] right-[-9999px] m-auto'}>{message}</div>
        </Transition>
    </div>
}
