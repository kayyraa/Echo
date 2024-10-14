export const FirebaseConfig = {
    apiKey: "AIzaSyCCoQ2eh26fGoQ3qAaP4d2snLNw8o2DJW4",
    authDomain: "echo-25a51.firebaseapp.com",
    projectId: "echo-25a51",
    storageBucket: "echo-25a51.appspot.com",
    messagingSenderId: "1001148635045",
    appId: "1:1001148635045:web:32343456e42603e98bba4c",
    measurementId: "G-SECCVC7YMP"
};

export function FilterKeywords(Words = [], Parent = HTMLElement) {
    Words.forEach(Word => {
        let Element;

        if (Word.startsWith("<img>") && Word.endsWith("</img>")) {
            let Focused = false;

            const ImageUrl = Word.replace("<img>", "").replace("</img>", "");
            Element = document.createElement("img");
            Element.src = ImageUrl;
            Element.style.cursor = "pointer";
            Element.onclick = () => {
                Focused = !Focused;
                
                Element.style.position = Focused ? "absolute" : "";
                Element.style.width = Focused ? "50%" : "";
                Element.style.left = Focused ? "25%" : "";
            };
        } else {
            Element = document.createElement("span");
            Element.textContent = Word;
        }

        if (Element) {
            Element.classList.add("Pure");
            Parent.appendChild(Element);
        }
    });
}