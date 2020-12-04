import { split } from "../src/sentence-splitter";

const textElement = document.querySelector("#text") as HTMLTextAreaElement;
const jsonElement = document.querySelector("#json") as HTMLTextAreaElement;

const onUpdate = (text: string) => {
    try {
        const json = split(text);
        jsonElement.textContent = JSON.stringify(json, null, 4);
    } catch {}
};

textElement?.addEventListener("input", () => {
    onUpdate(textElement.value);
});

const textFromURL = new URL(location.href).searchParams.get("text");
if (textFromURL) {
    const decodedText = decodeURIComponent(textFromURL);
    textElement.value = decodedText;
    onUpdate(decodedText);
}
