import { useContext, useEffect } from "react";
import { ScrollContext } from "~provider/scroll";

const Scroll = (props: any) => {
    const { children } = props;
    const { scrollRef } = useContext(ScrollContext);
    useEffect(() => {
        const handleScroll = () => {
            // console.log(scrollRef.current.scrollLeft);
            // console.log(scrollRef.current.scrollTop);
            // console.log(scrollRef)
            // setScrollX(scrollRef.current.scrollLeft);
            // setScrollY(scrollRef.current.scrollTop);
        }

        scrollRef.current.addEventListener("scroll", handleScroll);

        return () => {
            scrollRef.current.removeEventListener("scroll", handleScroll);
        }
    }, [children]);

    return (
        <div id={"readsomething-scroll"} ref={scrollRef} className={"fixed h-full  w-full overflow-scroll left-0 top-0"}
            style={{ backgroundColor: "var(--main-background)" }}>
            {children}
        </div>
    );
};

export default Scroll;
