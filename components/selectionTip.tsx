import {useEffect} from "react";

export function SelectionTip() {
    const plasmoRoot = document.querySelectorAll('plasmo-csui')[0].shadowRoot
    const plasmoContainer = plasmoRoot.querySelector('#plasmo-shadow-container')

    const onMouseUp = function (e) {
        const selection = window.getSelection()
        console.log(selection)

        const start = selection.anchorOffset;
        const end = selection.focusOffset;
    }

    useEffect(() => {
        plasmoContainer.addEventListener('mouseup', onMouseUp)

        return () => {
            plasmoContainer.removeEventListener('mouseup', onMouseUp)
        }
    }, []);

    return <div></div>
}
