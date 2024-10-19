import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";
import { getFirestore, collection, query, where, doc, getDocs, getDoc, addDoc, deleteDoc, updateDoc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import * as Api from "./api.js";

const App = initializeApp(Api.FirebaseConfig);
const Db = getFirestore(App);
const Analytics = getAnalytics(App);

const UsersCollection = collection(Db, "users");
const ConversationsCollection = collection(Db, "conversations");

const ConversationsSnapshot = await getDocs(ConversationsCollection);
const UserData = JSON.parse(localStorage.getItem("USER"));

const ImageUploadButton = document.getElementById("ImageUploadButton");
const ImageButton = document.getElementById("ImageButton");
const SendButton = document.getElementById("SendButton");
const AddConversationButton = document.getElementById("AddConversationButton");
const AddConversationButtonSmall = document.getElementById("AddConversationButtonSmall");

const AbsoluteMessages = document.getElementById("AbsoluteMessages");

const Buttons = document.querySelector(".Buttons");
const ImagePrompt = document.querySelector(".ImagePrompt");
const ConversationsContainer = document.querySelector(".Conversations");
const MessagesContainer = document.querySelector(".Messages");
const RemoveButton = document.querySelector(".RemoveButton");

const MessageInput = document.getElementById("MessageInput");
const ImageInput = document.getElementById("ImageInput");

var Snap = false;

function GenerateMessages(ConversationId, Messages) {
    var LastType
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

    if (Messages.length > 0) {
        Messages.forEach(async (MessageObject, Index) => {
            if (!MessageObject.user) return;

            const SenderQuery = query(UsersCollection, where("username", "==", MessageObject.user));
            const SenderSnapshot = await getDocs(SenderQuery);
            const SenderUserData = SenderSnapshot.docs[0]?.data();

            const MessageContent = document.createElement("div");
            MessageContent.classList.add("Pure");
            MessageContent.style.order = MessageObject.timestamp;
            AbsoluteMessages.appendChild(MessageContent);

            const UserProfileContainer = document.createElement("div");
            UserProfileContainer.classList.add("UserProfileContainer");
            MessageContent.appendChild(UserProfileContainer);

            const UserProfilePhoto = document.createElement("img");
            UserProfilePhoto.src = SenderUserData?.profilePhoto || "../images/DefaultUser.svg";
            UserProfileContainer.appendChild(UserProfilePhoto);

            const UserUsernameLabel = document.createElement("span");
            UserUsernameLabel.innerHTML = MessageObject.user;
            UserProfileContainer.appendChild(UserUsernameLabel);

            const WordsContainer = document.createElement("div");
            MessageContent.appendChild(WordsContainer);

            Api.FilterKeywords(MessageObject.message.split(" "), WordsContainer);

            if (String(MessageObject.user).toLowerCase().trim() === String(UserData.username).toLowerCase().trim()) {
                MessageContent.setAttribute("client", "");
            }

            AbsoluteMessages.scrollTop = AbsoluteMessages.scrollHeight;
        });
    } else {
        const NoMessagesLabel = document.createElement("p");
        NoMessagesLabel.innerHTML = "No messages yet.";
        AbsoluteMessages.appendChild(NoMessagesLabel);
    }

    AbsoluteMessages.scrollTop = AbsoluteMessages.scrollHeight;
    Snap = true;
}

async function GenerateConversation(OtherUsername, Between, ConversationDoc) {
    var ConversationStatus

    Array.from(ConversationsContainer.getElementsByTagName("div")).forEach(Conversation => {
        Conversation.remove();
    });

    const OtherUserQuery = await query(UsersCollection, where("username", "==", OtherUsername));
    const OtherUserSnapshot = await getDocs(OtherUserQuery);

    if (OtherUserSnapshot.empty) return;

    const OtherUserData = OtherUserSnapshot.docs[0].data();
    let OldStatus = OtherUserData.status;

    const Conversation = document.createElement("div");
    ConversationsContainer.appendChild(Conversation);

    const CoverImageContainer = document.createElement("div");
    CoverImageContainer.classList.add("CoverImageContainer");
    Conversation.appendChild(CoverImageContainer);

    const ConversationCoverImage = document.createElement("img");
    ConversationCoverImage.src = OtherUserData.profilePhoto !== "" ? OtherUserData.profilePhoto : "../images/DefaultUser.svg";
    CoverImageContainer.appendChild(ConversationCoverImage);

    const Members = Between.map(user => user.replace(/"/g, ''));

    const MembersData = await Promise.all(
        Members.map(async (Username) => {
            const MemberQuery = query(UsersCollection, where("username", "==", Username));
            const MemberSnapshot = await getDocs(MemberQuery);
            return MemberSnapshot.docs[0]?.data() || null;
        })
    );

    const ConversationName = ConversationDoc.data().name || OtherUsername;
    const IsGroup = Members.length > 2;

    if (IsGroup) {
        let Index = 0;

        const Loop = async () => {
            ConversationCoverImage.src = MembersData[Index]?.profilePhoto || "../images/DefaultUser.svg";
            Index = (Index + 1) % Members.length;
            setTimeout(Loop, 750);
        };

        Loop();
    } else {
        ConversationStatus = document.createElement("img");
        CoverImageContainer.appendChild(ConversationStatus);

        ConversationStatus.src = `../images/${OtherUserData.status || "Offline"}.svg`
        ConversationCoverImage.src = OtherUserData.profilePhoto || "../images/DefaultUser.svg";
    }

    const ConversationNameLabel = document.createElement("span");
    ConversationNameLabel.innerHTML = ConversationName;
    Conversation.appendChild(ConversationNameLabel);

    RemoveButton.onclick = async () => {
        await deleteDoc(ConversationDoc.ref);
        location.reload();
    };

    Conversation.onclick = () => {
        MessageInput.placeholder = `Message to ${IsGroup ? "" : "@"}${ConversationName}`;
        document.title = `Echo - ${IsGroup ? "" : "@"}${ConversationName}`;
        GenerateMessages(ConversationDoc.id, ConversationDoc.data().messages);
    };

    if (!IsGroup) {
        await onSnapshot(OtherUserSnapshot.docs[0].ref, (Snapshot) => {
            const NewStatus = Snapshot.data().status;
            if (NewStatus === OldStatus) return;
    
            OldStatus = NewStatus;
    
            ConversationStatus.src = `../images/${NewStatus || "Offline"}.svg`;
        });
    }    

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

        GenerateMessages(ConversationDoc.id, Between, Snapshot.data().messages);
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
    if (!window.CurrentConversationId || !Message) return;

    const CurrentConversationDocRef = doc(ConversationsCollection, window.CurrentConversationId);
    const CurrentConversationSnap = await getDoc(CurrentConversationDocRef);
    if (!CurrentConversationSnap.exists()) return;

    const CurrentMessages = CurrentConversationSnap.data().messages || [];
    const NewMessage = {
        message: Message,
        timestamp: Math.floor(Date.now() / 1000),
        user: UserData.username
    };

    CurrentMessages.push(NewMessage);
    await updateDoc(CurrentConversationDocRef, {
        messages: CurrentMessages
    });

    MessageInput.value = "";
    GenerateMessages(window.CurrentConversationId, CurrentMessages);
    AbsoluteMessages.scrollTop = AbsoluteMessages.scrollHeight;
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
        if (ValidUsers.length === 2) {
            await addDoc(ConversationsCollection, {
                between: Between,
                messages: []
            });
        } else {
            await addDoc(ConversationsCollection, {
                between: Between,
                messages: [],
                name: `${ValidUsers.slice(0, -1).join(", ")}${ValidUsers.length > 2 ? "," : ""} and ${Members[ValidUsers.length - 1]}`
            });
        }

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
        Buttons.style.pointerEvents = "auto";
        ConversationsContainer.style.top = "3vh";
    } else {
        Buttons.style.opacity = "0";
        Buttons.style.pointerEvents = "none";
        ConversationsContainer.style.top = "-1vh";
    }
}

MessageInput.addEventListener("keyup", CheckEligibility);
MessageInput.addEventListener("keydown", CheckEligibility);
AddConversationButton.addEventListener("click", AddConversation);
AddConversationButtonSmall.addEventListener("click", AddConversation);