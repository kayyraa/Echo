import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import * as Echo from "./echo.js";

const App = initializeApp(Echo.FirebaseConfig);
const Db = getFirestore(App);
const UsersCollection = collection(Db, "users");

const UsernameLabel = document.getElementById("UsernameLabel");
const ProfileAboutMeLabel = document.getElementById("ProfileAboutMeLabel");

const ProfilePhotoLabel = document.getElementById("ProfilePhotoLabel");
const ProfilePhotoUrlInput = document.getElementById("ProfilePhotoUrlInput");
const ProfilePhotoFileInput = document.getElementById("ProfilePhotoFileInput");
const ProfileAboutMeInput = document.getElementById("ProfileAboutMeInput");

const ProfilePhotoSaveButton = document.getElementById("ProfilePhotoSaveButton");
const ProfileAboutMeSaveButton = document.getElementById("ProfileAboutMeSaveButton");

let UserData;
let UserDocSnapshot;

async function FetchUserData() {
    UserData = JSON.parse(localStorage.getItem("USER"));
    const UserDocQuery = query(UsersCollection, where("username", "==", UserData.username));
    
    try {
        UserDocSnapshot = await getDocs(UserDocQuery);
        if (UserDocSnapshot.docs.length > 0) {
            return UserDocSnapshot.docs[0].data();
        } else {
            throw new Error("User not found.");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const UserDocData = await FetchUserData();

    if (UserDocData) {
        ProfilePhotoLabel.src = UserDocData.profilePhoto !== "" ? UserDocData.profilePhoto : "../images/DefaultUser.svg";
        ProfileAboutMeLabel.innerHTML = UserDocData.aboutMe ? UserDocData.aboutMe : "";
        UsernameLabel.innerHTML = UserData.username;
    }
});

ProfilePhotoSaveButton.addEventListener("click", async () => {
    if (ProfilePhotoUrlInput.value) {
        const ImageURL = ProfilePhotoUrlInput.value;

        if (UserDocSnapshot && UserDocSnapshot.docs.length > 0) {
            await updateDoc(UserDocSnapshot.docs[0].ref, {
                profilePhoto: ImageURL
            });
        }
    } else {
        const ImageFile = ProfilePhotoFileInput.files[0];
        if (!ImageFile) return;

        const StorageRef = ref(getStorage(), `uploads/${ImageFile.name}`);
        await uploadBytes(StorageRef, ImageFile);
        const ImageURL = await getDownloadURL(StorageRef);

        await updateDoc(UserDocSnapshot.docs[0].ref, {
            profilePhoto: ImageURL
        });
        location.reload();
    }
});

ProfileAboutMeSaveButton.addEventListener("click", async () => {
    const AboutMe = ProfileAboutMeInput.value;
    if (UserDocSnapshot && UserDocSnapshot.docs.length > 0) {
        await updateDoc(UserDocSnapshot.docs[0].ref, {
            aboutMe: AboutMe
        });
        ProfileAboutMeLabel.innerHTML = AboutMe;
        ProfileAboutMeInput.value = "";
        location.reload();
    }
});