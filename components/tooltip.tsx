import type { MouseEvent, ReactNode } from "react";
import React, { useState } from "react";
import { Transition } from "@headlessui/react";

interface ToolTipProps {
    children: ReactNode,
    maxWidth?: number,
    message: string,
    // The delay (in ms) before showing the tooltip, default is 1000
    margin?: number
}

const Tooltip = ({
    children,
    maxWidth,
    message,
    margin
}: ToolTipProps) => {
    const _maxWidth = maxWidth ?? 'max-content'
    const _margin = margin ?? 10
    const [showContent, setShowContent] = useState(false);

    function contentMouseOver (e: MouseEvent<HTMLDivElement>) {
        setShowContent(true)
    }

    function contentMouseLeave () {
        setShowContent(false)
    }

    return <div className={'relative tooltip'}>
        <div className={'tooltip-content'} onMouseLeave={contentMouseLeave}
            onMouseOver={contentMouseOver}>{children}</div>
        {
            <Transition
                show={showContent}
                enter="transition-opacity delay-500 duration-200"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div style={{ maxWidth: _maxWidth, top: `calc(100% + ${_margin}px)` }}
                    className={'tip absolute w-fit left-[-9999px] right-[-9999px] m-auto'}>{message}</div>
            </Transition>
        }
    </div>
}

export default React.memo(Tooltip);
