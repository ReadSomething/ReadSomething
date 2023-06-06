import React, { useContext, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import ChatBox from "~components/chat_box";
import { throttle } from "lodash";
import { getLatestState } from "~utils/state";
import { ReaderContext } from "~provider/reader";

function ChatArticle () {
    const [transition, setTransition] = useState("all 0.2s ease-in-out");
    const [reactivePosition, setReactivePosition] = useState({ reactiveX: 0.7, reactiveY: 0.1 });
    const [scrollTop, setScrollTop] = useState(0);
    const { chatOn } = useContext(ReaderContext);

    useEffect(() => {
        const handleScroll = throttle(async () => {
            const p = await getLatestState(setReactivePosition);

            setScrollTop(scrollRef?.scrollTop);

            this.rnf.updatePosition({
                x: window.innerWidth * p.reactiveX,
                y: window.innerHeight * p.reactiveY + scrollRef?.scrollTop
            });
        }, 100);

        const scrollRef = document.querySelectorAll("plasmo-csui")[0].shadowRoot.getElementById("rs-scroll");
        scrollRef?.addEventListener("scroll", handleScroll);

        return () => {
            scrollRef?.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <Rnd
            id="rs-chat-container"
            ref={e => {
                this.rnf = e;
            }}
            default={{
                x: reactivePosition.reactiveX * window.innerWidth,
                y: reactivePosition.reactiveY * window.innerHeight,
                width: "25vw",
                height: "60vh"
            }}
            minWidth={"10vw"}
            minHeight={"20vh"}
            bounds="window"
            style={{ transition }}
            onDragStart={(e, d) => {
                setTransition("none");
            }}
            onDragStop={(e, d) => {
                console.log(d);
                setTransition("all 0.2s ease-in-out");
                setReactivePosition({
                    reactiveX: d.lastX / window.innerWidth,
                    reactiveY: (d.lastY - scrollTop) / window.innerHeight
                });
            }}
            onResizeStop={async (e, direction, ref, delta, position) => {
                const p = await getLatestState(setReactivePosition);
                let currentX = p.reactiveX * window.innerWidth;
                let currentY = scrollTop + p.reactiveY * window.innerHeight;

                if (direction === "top") {
                    currentY = currentY - delta.height;
                } else if (direction === "topLeft") {
                    currentX = currentX - delta.width;
                    currentY = currentY - delta.height;
                } else if (direction === "left") {
                    currentX = currentX - delta.width;
                } else if (direction === "bottomLeft") {
                    currentX = currentX - delta.width;
                } else if (direction === "bottom") {
                    // do nothing
                } else if (direction === "bottomRight") {
                    // do nothing
                } else if (direction === "right") {
                    // do nothing
                } else if (direction === "topRight") {
                    currentY = currentY - delta.height;
                }

                setReactivePosition({
                    reactiveX: currentX / window.innerWidth,
                    reactiveY: (currentY - scrollTop) / window.innerHeight
                });
            }}
            enableUserSelectHack={false}
            dragHandleClassName={"rs-chat-draggable"}
        >
            { chatOn ? <ChatBox /> : null }
        </Rnd>
    );

}

export default React.memo(ChatArticle);
