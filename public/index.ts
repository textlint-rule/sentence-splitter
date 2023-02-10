import { split } from "../src/sentence-splitter.js";

const textElement = document.querySelector("#text") as HTMLTextAreaElement;
const jsonElement = document.querySelector("#json") as HTMLTextAreaElement;

const onUpdate = (text: string) => {
    try {
        const json = split(text);
        jsonElement.textContent = JSON.stringify(json, null, 4);
        location.hash = encodeURIComponent(text);
    } catch {}
};

textElement?.addEventListener("input", () => {
    onUpdate(textElement.value);
});

const textFromURL = location.hash;
if (textFromURL.length > 0) {
    const decodedText = decodeURIComponent(textFromURL);
    textElement.value = decodedText;
    onUpdate(decodedText);
}
