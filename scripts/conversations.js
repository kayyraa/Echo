import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import * as Echo from "./echo.js";

const App = initializeApp(Echo.FirebaseConfig);
const Db = getFirestore(App);
const UsersCollection = collection(Db, "users");
const ConversationsCollection = collection(Db, "conversations");

const ConversationsSnapshot = await getDocs(ConversationsCollection);
const UserData = JSON.parse(localStorage.getItem("USER"));

const ConversationsContainer = document.querySelector(".Conversations");
const MessagesContainer = document.querySelector(".Messages");
const MessageInput = document.getElementById("MessageInput");

var Snap = false;

function GenerateMessages(ConversationId, Messages) {
    window.CurrentConversationId = ConversationId;

    Array.from(MessagesContainer.getElementsByTagName("i")).forEach(Spinner => {
        Spinner.remove();
    });
    Array.from(MessagesContainer.getElementsByTagName("div")).forEach(OldMessage => {
        OldMessage.remove();
    });
    Array.from(MessagesContainer.getElementsByTagName("p")).forEach(OldMessage => {
        OldMessage.remove();
    });

    if (Messages.length > 0) {
        Messages.forEach(MessageObject => {
            const Message = document.createElement("div");
            Message.innerHTML = MessageObject.message;
            MessagesContainer.appendChild(Message);
    
            if (String(MessageObject.user).toLowerCase().trim() === String(UserData.username).toLowerCase().trim()) {
                Message.setAttribute("client", "");
            }
        });
    } else {
        const EmptyLabel = document.createElement("p");
        EmptyLabel.innerHTML = "No messages yet.";
        MessagesContainer.appendChild(EmptyLabel);
    }

    Snap = true;
}

async function GenerateConversation(OtherUsername, ConversationDoc) {
    const OtherUserQuery = query(UsersCollection, where("username", "==", OtherUsername));
    const OtherUserSnapshot = await getDocs(OtherUserQuery);

    if (OtherUserSnapshot.empty) return;

    const OtherUserData = OtherUserSnapshot.docs[0].data();

    const Conversation = document.createElement("div");
    ConversationsContainer.appendChild(Conversation);

    const OtherProfileLabel = document.createElement("img");
    OtherProfileLabel.src = OtherUserData.profilePhoto !== "" ? OtherUserData.profilePhoto : "../images/DefaultUser.svg";
    Conversation.appendChild(OtherProfileLabel);

    const OtherUsernameLabel = document.createElement("span");
    OtherUsernameLabel.innerHTML = OtherUserData.username;
    Conversation.appendChild(OtherUsernameLabel);

    Conversation.onclick = () => {
        GenerateMessages(ConversationDoc.id, ConversationDoc.data().messages);
    };

    await onSnapshot(ConversationDoc.ref, (Snapshot) => {
        if (Snap === false) return;
        GenerateMessages(ConversationDoc.id, Snapshot.data().messages);
    });
}

async function FetchConversations() {
    ConversationsSnapshot.forEach((Document) => {
        const Data = Document.data();
        const Between = Data.between;

        if (Between.includes(UserData.username)) {
            const OtherUsername = Between.filter(Item => Item !== UserData.username)[0];
            GenerateConversation(OtherUsername, Document);
        }
    });
}

FetchConversations();

MessageInput.addEventListener("keypress", async (Event) => {
    if (String(Event.key).toLowerCase() === "enter") {
        if (!window.CurrentConversationId) return;

        const Message = MessageInput.value;

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
});