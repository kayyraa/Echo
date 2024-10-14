import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import * as Echo from "./echo.js";

const App = initializeApp(Echo.FirebaseConfig);
const Db = getFirestore(App);
const UsersCollection = collection(Db, "users");
const ConversationsCollection = collection(Db, "conversations");

const ConversationsSnapshot = await getDocs(ConversationsCollection);
const UserData = JSON.parse(localStorage.getItem("USER"));

const ImageUploadButton = document.getElementById("ImageUploadButton");
const ImageButton = document.getElementById("ImageButton");
const SendButton = document.getElementById("SendButton");
const AddConversationButton = document.getElementById("AddConversationButton");
const AddConversationButtonSmall = document.getElementById("AddConversationButtonSmall");
const NavigationLabel = document.getElementById("NavigationLabel");

const AbsoluteMessages = document.getElementById("AbsoluteMessages");

const Buttons = document.querySelector(".Buttons");
const ImagePrompt = document.querySelector(".ImagePrompt");
const ConversationsContainer = document.querySelector(".Conversations");
const MessagesContainer = document.querySelector(".Messages");

const MessageInput = document.getElementById("MessageInput");
const ImageInput = document.getElementById("ImageInput");

var Snap = false;

function GenerateMessages(ConversationId, Messages) {
    window.CurrentConversationId = ConversationId;

    Array.from(AbsoluteMessages.getElementsByTagName("i")).forEach(Spinner => {
        Spinner.remove();
    });
    Array.from(AbsoluteMessages.getElementsByTagName("div")).forEach(OldMessage => {
        if (!OldMessage.classList.contains("InputSection")) {
            OldMessage.remove();
        }
    });
    Array.from(AbsoluteMessages.getElementsByTagName("p")).forEach(OldMessage => {
        OldMessage.remove();
    });

    Messages.forEach(async MessageObject => {
        const SenderQuery = query(UsersCollection, where("username", "==", MessageObject.user));
        const SenderSnapshot = await getDocs(SenderQuery);
        const SenderUserData = SenderSnapshot.docs[0].data();

        const MessageContent = document.createElement("div");
        MessageContent.classList.add("Pure");
        MessageContent.style.order = MessageContent.timestamp;
        AbsoluteMessages.appendChild(MessageContent);

        const UserProfileContainer = document.createElement("div");
        UserProfileContainer.classList.add("UserProfileContainer");
        MessageContent.appendChild(UserProfileContainer);

        const UserProfilePhoto = document.createElement("img");
        UserProfilePhoto.src = SenderUserData.profilePhoto !== "" ? SenderUserData.profilePhoto : "../images/DefaultUser.svg";
        UserProfileContainer.appendChild(UserProfilePhoto);

        const UserUsernameLabel = document.createElement("span");
        UserUsernameLabel.innerHTML = MessageObject.user;
        UserProfileContainer.appendChild(UserUsernameLabel);

        const WordsContainer = document.createElement("div");
        MessageContent.appendChild(WordsContainer);

        Echo.FilterKeywords(MessageObject.message.split(" "), WordsContainer);

        if (String(MessageObject.user).toLowerCase().trim() === String(UserData.username).toLowerCase().trim()) {
            MessageContent.setAttribute("client", "");
        }
    });

    Snap = true;
}

async function GenerateConversation(OtherUsername, Between, ConversationDoc) {
    const OtherUserQuery = await query(UsersCollection, where("username", "==", OtherUsername));
    const OtherUserSnapshot = await getDocs(OtherUserQuery);

    if (OtherUserSnapshot.empty) return;

    const OtherUserData = OtherUserSnapshot.docs[0].data();

    const Conversation = document.createElement("div");
    ConversationsContainer.appendChild(Conversation);

    const OtherProfileLabel = document.createElement("img");
    OtherProfileLabel.src = OtherUserData.profilePhoto !== "" ? OtherUserData.profilePhoto : "../images/DefaultUser.svg";
    Conversation.appendChild(OtherProfileLabel);

    const UserList = Between.map(user => user.replace(/"/g, ''));
    const ConversationName = UserList.length > 2 ? `${UserList.slice(0, -1).join(", ")}${UserList.length > 2 ? "," : ""} and ${UserList[UserList.length - 1]}` : OtherUsername;
    const IsGroup = UserList.length > 2;

    const OtherUsernameLabel = document.createElement("span");
    OtherUsernameLabel.innerHTML = ConversationName;
    Conversation.appendChild(OtherUsernameLabel);

    const RemoveButton = document.createElement("img");
    RemoveButton.src = "../images/Remove.svg";
    Conversation.appendChild(RemoveButton);

    RemoveButton.onclick = async () => {
        await deleteDoc(ConversationDoc.ref);
        location.reload();
    };

    Conversation.onclick = () => {
        MessageInput.placeholder = `Message to ${IsGroup ? "" : "@"}${ConversationName}${IsGroup ? " Group" : ""}`;
        document.title = `Echo - ${IsGroup ? "" : "@"}${ConversationName}${IsGroup ? " Group" : ""}`;
        NavigationLabel.innerHTML = `> ${ConversationName}`;
        GenerateMessages(ConversationDoc.id, ConversationDoc.data().messages);
    };

    await onSnapshot(ConversationDoc.ref, (Snapshot) => {
        if (Snap === false) return;
        if (Snapshot.data().messages.length > 0) {
            if (Snapshot.data().messages.reduce((MaxItem, CurrentItem) => CurrentItem.timestamp > MaxItem.timestamp ? CurrentItem : MaxItem).user !== UserData.username) {
                if (Notification.permission === "granted") {
                    new Notification(`New message from ${Snapshot.data().messages.reduce((MaxItem, CurrentItem) => CurrentItem.timestamp > MaxItem.timestamp ? CurrentItem : MaxItem).user}`, {
                        body: Snapshot.data().messages.reduce((MaxItem, CurrentItem) => CurrentItem.timestamp > MaxItem.timestamp ? CurrentItem : MaxItem).message,
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then((Permission) => {
                        if (Permission === "granted") {
                            new Notification(`New message from ${Snapshot.data().messages.reduce((MaxItem, CurrentItem) => CurrentItem.timestamp > MaxItem.timestamp ? CurrentItem : MaxItem).user}`, {
                                body: Snapshot.data().messages.reduce((MaxItem, CurrentItem) => CurrentItem.timestamp > MaxItem.timestamp ? CurrentItem : MaxItem).message,
                            });
                        }
                    });
                }
            }
        }

        GenerateMessages(ConversationDoc.id, Snapshot.data().messages);
    });
}

async function FetchConversations() {
    ConversationsSnapshot.forEach((Document) => {
        const Data = Document.data();
        const Between = Data.between;

        if (Between.includes(UserData.username)) {
            const OtherUsername = Between.filter(Item => Item !== UserData.username)[0];
            if (OtherUsername) {
                GenerateConversation(OtherUsername, Between, Document);
            }
        }
    });

    Array.from(ConversationsContainer.getElementsByTagName("i")).forEach(Spinner => {
        Spinner.remove();
    });
    Array.from(MessagesContainer.getElementsByTagName("i")).forEach(Spinner => {
        Spinner.remove();
    });
}

FetchConversations();

async function SendMessage(Message) {
    if (!window.CurrentConversationId) return;
    if (!Message) return;

    const CurrentConversationDoc = await getDocs(query(ConversationsCollection, where("__name__", "==", window.CurrentConversationId)));
    if (CurrentConversationDoc.empty) return;

    const CurrentMessages = CurrentConversationDoc.docs[0].data().messages || [];
    const NewMessage = {
        message: Message,
        timestamp: Math.floor(Date.now() / 1000),
        user: UserData.username
    };

    CurrentMessages.push(NewMessage);
    await updateDoc(CurrentConversationDoc.docs[0].ref, {
        messages: CurrentMessages
    });

    MessageInput.value = "";
    Array.from(MessagesContainer.getElementsByTagName("p")).forEach(OldMessage => {
        OldMessage.remove();
    });
}

MessageInput.addEventListener("keypress", async (Event) => {
    if (String(Event.key).toLowerCase() === "enter") {
        SendMessage(MessageInput.value);
    }
});

async function AddConversation() {
    const Conversation = MessageInput.value;
    if (!Conversation) return;

    const UsersList = Conversation.split(',').map(user => user.trim().toLowerCase());

    if (UsersList.includes(UserData.username.toLowerCase())) return;

    const AllUsers = await getDocs(UsersCollection);
    const ValidUsers = [];

    AllUsers.forEach(User => {
        const Username = User.data().username;
        const LowerCaseUsername = Username.toLowerCase().trim();

        if (UsersList.includes(LowerCaseUsername)) {
            ValidUsers.push(Username);
        }
    });

    ValidUsers.push(UserData.username);
    const Between = ValidUsers.sort();

    const ExistingConversations = await getDocs(ConversationsCollection);
    const ConversationExists = ExistingConversations.docs.some(doc =>
        JSON.stringify(doc.data().between.sort()) === JSON.stringify(Between)
    );

    if (!ConversationExists) {
        await addDoc(ConversationsCollection, {
            between: Between,
            messages: []
        });

        location.reload();
    }
}

ImageUploadButton.addEventListener("click", async () => {
    const Image = ImageInput.files[0];
    if (!Image) return;

    const StorageRef = ref(getStorage(), `uploads/${Image.name}`);
    await uploadBytes(StorageRef, Image);

    const ImageURL = await getDownloadURL(StorageRef);

    MessageInput.value += ` <img>${ImageURL}</img>`;
    ImagePrompt.style.visibility = 'hidden';
});

ImageButton.addEventListener("click", () => {
    ImagePrompt.style.visibility = getComputedStyle(ImagePrompt).visibility === "visible" ? "hidden" : "visible";
});

SendButton.addEventListener("click", () => {
    SendMessage(MessageInput.value);
});

ConversationsContainer.style.top = "-1vh";

function CheckEligibility() {
    if (MessageInput.value != "" && MessageInput.value !== UserData.username) {
        Buttons.style.opacity = "1";
        ConversationsContainer.style.top = "4vh";
    } else {
        Buttons.style.opacity = "0";
        ConversationsContainer.style.top = "-1vh";
    }
}

MessageInput.addEventListener("keyup", CheckEligibility);
MessageInput.addEventListener("keydown", CheckEligibility);
AddConversationButton.addEventListener("click", AddConversation);
AddConversationButtonSmall.addEventListener("click", AddConversation);