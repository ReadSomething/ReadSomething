import React, { useContext, useEffect } from "react";
import { Rnd } from "react-rnd";
import ChatBox from "~components/chat_box";
import { ScrollContext } from "~provider/scroll";
import { throttle } from "lodash";

function ChatArticle () {
    const { scrollRef } = useContext(ScrollContext);

    useEffect(() => {
        const handleScroll = throttle(() => {
            this.rnf.updatePosition({
                x: window.innerWidth * 0.7 + scrollRef.current.scrollLeft,
                y: window.innerHeight * 0.1 + scrollRef.current.scrollTop
            });
        }, 100);

        scrollRef.current.addEventListener("scroll", handleScroll);

        return () => {
            scrollRef.current.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <Rnd
            ref={e => {
                this.rnf = e;
            }}
            default={{
                x: window.innerWidth * 0.7,
                y: window.innerHeight * 0.1,
                width: "25vw",
                height: "80vh"
            }}
            minWidth={"25vw"}
            minHeight={"80vh"}
            bounds="window"
        >
            <ChatBox />
        </Rnd>
    );

}

export default React.memo(ChatArticle);
