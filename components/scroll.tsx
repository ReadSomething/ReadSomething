const Scroll = (props: any) => {
    const { children } = props;

    return (
        <div id={"rs-scroll"}
            className={"fixed h-full  w-full overflow-scroll left-0 top-0"}
            style={{ backgroundColor: "var(--main-background)" }}>
            {children}
        </div>
    );
};

export default Scroll;
