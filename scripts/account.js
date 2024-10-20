import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import * as Fire from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import * as Api from "./api.js";

const App = initializeApp(Api.FirebaseConfig);
const Db = Fire.getFirestore(App);
const UsersCollection = Fire.collection(Db, "users");

const UsernameLabel = document.getElementById("UsernameLabel");
const PasswordInput = document.getElementById("PASSINPUT");
const UsernameInput = document.getElementById("USERINPUT");
const SubmitButton = document.getElementById("SUBMITBUTTON");
const SignInButton = document.getElementById("SignInButton");

if (SubmitButton) {
    SubmitButton.addEventListener("click", async () => {
        const Username = UsernameInput.value;
        const Password = PasswordInput.value;

        if (!Password || !Username) {
            return;
        }

        const UserDocRef = Fire.doc(UsersCollection, String(Username).toLowerCase().trim());
        const DocSnapshot = await Fire.getDoc(UserDocRef);

        let UserData;

        if (!DocSnapshot.exists()) {
            UserData = {
                register: Math.floor(Date.now() / 1000),
                username: Username,
                password: Password,
                profilePhoto: "",
            };

            await Fire.setDoc(UserDocRef, UserData);
        } else {
            if (DocSnapshot.data().password === Password) {
                UserData = {
                    register: DocSnapshot.data().register,
                    username: DocSnapshot.data().username,
                    password: DocSnapshot.data().password,
                    profilePhoto: DocSnapshot.data().profilePhoto,
                    id: DocSnapshot.data().register
                };
            } else {
                return;
            }
        }

        window.UserData = UserData;
        localStorage.setItem("USER", JSON.stringify(UserData));
        window.location.href = "../index.html";
    });
} else if (!localStorage.getItem("USER")) {
    window.location.href = "../account.html";
} else if (localStorage.getItem("USER")) {
    const UserDocRef = Fire.doc(UsersCollection, String(JSON.parse(localStorage.getItem("USER")).username).toLowerCase().trim());

    await Fire.updateDoc(UserDocRef, {
        status: "Online",
    });

    window.addEventListener("beforeunload", async () => {
        await Fire.updateDoc(UserDocRef, {
            status: "Offline",
        });
    });

    let InactivityTimeout;

    async function ResetTimeout() {
        await Fire.updateDoc(UserDocRef, {
            status: "Online",
        });
        clearTimeout(InactivityTimeout);
        InactivityTimeout = setTimeout(HandleInactivity, 150000);
    }

    async function HandleInactivity() {
        await Fire.updateDoc(UserDocRef, {
            status: "Away",
        });
    }

    window.addEventListener("keydown", ResetTimeout);
    window.addEventListener("click", ResetTimeout);
    window.addEventListener("scroll", ResetTimeout);

    ResetTimeout();

    UsernameLabel.innerHTML = JSON.parse(localStorage.getItem("USER")).username;
    if (SignInButton) SignInButton.remove();
}