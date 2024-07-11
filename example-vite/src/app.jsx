export function App() {
    async function keyDown(e) {
        if (e.key == "Enter" && window.chemicalLoaded && e.target.value) {
            window.location = await window.chemicalEncode(e.target.value)
        }
    }

    return (
        <>
            <h1>Chemical Example</h1>
            <input onKeyDown={keyDown} placeholder="Enter URL" />
        </>
    )
}
