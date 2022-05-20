var rhit = rhit || {};

rhit.FB_COLLECTION_FINDATEAM = "FindATeam";
rhit.FB_COLLECTION_HIGHLIGHT = "Highlight";
rhit.FB_KEY_CONTENT = "content";
rhit.FB_KEY_RANK = "rank";
rhit.FB_KEY_CURRENTNUM = "currentNum";
rhit.FB_KEY_PLAYNUM = "playerNum";
rhit.FB_KEY_AUTH = "author";
rhit.FB_KEY_TEAMMEMBER = "teamMember"
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.FB_KEY_TOPIC = "Topic";
rhit.FB_KEY_PHOTOURL = "photoURL";
rhit.TeamListManager = null;
rhit.LoginManager = null;
rhit.TeamManager = null;
rhit.TeamchatManager = null;
rhit.HighlightListManager = null;
rhit.HighlightManager = null;
rhit.uid = null;
rhit.url = null;
rhit.signInIndicator = false;

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.FirstPageController = class {
	constructor() {
		document.querySelector("#goToLogin").onclick = (event) => {
			window.location.href = "/login.html";
		};
	}
}

rhit.LoginPageController = class {
	constructor() {
		const inputEmailEl = document.querySelector("#inputEmail");
		const inputPasswordEl = document.querySelector("#inputPassword");
		
		document.querySelector("#signOutButton").onclick = (event) => {
			rhit.LoginManager.signOut();
		};
		document.querySelector("#createAccountButton").onclick = (event) => {
			rhit.LoginManager.createAcc(inputEmailEl.value, inputPasswordEl.value);
		};
		document.querySelector("#logInButton").onclick = (event) => {
			rhit.LoginManager.signIn(inputEmailEl.value, inputPasswordEl.value);
		}
		document.querySelector("#anonymousAuthButton").onclick = (event) => {		
			rhit.LoginManager.signInAnonymously();
		}
		rhit.startFirebaseUI();
	}
}
rhit.loginManager = class{
	constructor(){
		this._user = null;
		firebase.auth().onAuthStateChanged((user) => {
			if (user){
				rhit.uid = user.uid;
				rhit.signInIndicator = true;
				console.log("The user is signed in", rhit.uid);}
			
		});		
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});
	}
	createAcc(userName, password){
		firebase.auth().createUserWithEmailAndPassword(userName, password)
			.catch((error) => {
				var errorCode = error.code;
				var errorMessage = error.message;
				console.log("Create acc error", errorCode, errorMessage);
			});
	}
	signIn(userName, password){
		firebase.auth().signInWithEmailAndPassword(userName, password)
			.catch((error) => {
				var errorCode = error.code;
				var errorMessage = error.message;
				console.log("Existing acc login error", errorCode, errorMessage);
			});
	}
	signInAnonymously(){
		firebase.auth().signInAnonymously()
			.catch((error) => {
				var errorCode = error.code;
				var errorMessage = error.message;
				console.log("Anonymous auth error", errorCode, errorMessage);
			});
	}
	signOut(){
		firebase.auth().signOut().then(() => {
			// Sign-out successful.
			rhit.signInIndicator = false;
			window.location.href = "/";
			console.log("You are now sign out");
		}).catch((error) => {
			// An error happened.
			console.log("Sign out error");
		});
	}
	// get uid() {
	// 	return uid;
	// }
	get isSignedIn() {
		return rhit.signInIndicator;
	}
	
}

rhit.teamManager = class {
	constructor(id) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_FINDATEAM).doc(id);
	}

	beginListening(changeListener) {
		console.log("Listen for changes to this quote");
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			console.log("Movie quote updated ", doc);
			if (doc.exists) {
				this._document = doc;
				changeListener();
			} else {
				console.log("Document does not exist any longer.");
				console.log("CONSIDER: automatically navigate back to the home page.");
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}
	get rank() {
		return this._document.get(rhit.FB_KEY_RANK);
	}

	get content() {
		return this._document.get(rhit.FB_KEY_CONTENT);
	}

	get playNum() {
		return this._document.get(rhit.FB_KEY_PLAYNUM);
	}

	get author() {
		 return this._document.get(rhit.FB_KEY_AUTH);
	}

	get id(){
		return this._ref.id;
	}

	get teamMember(){
		return this._document.get(rhit.FB_KEY_TEAMMEMBER);
	}

	update(content, rank, playNum) {
		this._ref.update({
				[rhit.FB_KEY_CONTENT]: content,
				[rhit.FB_KEY_RANK]: rank,
				[rhit.FB_KEY_PLAYNUM]: playNum,
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			}).then(() => {
			console.log("Document has been updated");
		});
	}
	delete() {
		return this._ref.delete();
	}
	addPlayer(id){
		let a = 0;
		for(let i = 0; i < rhit.TeamManager.teamMember.length; i++){
			if (rhit.TeamManager.teamMember[i] == rhit.uid){
				a = 1;
				break;
			}
			console.log(a);
		}
		if (a == 0){
			this._ref.update({
				[rhit.FB_KEY_TEAMMEMBER]: firebase.firestore.FieldValue.arrayUnion(id),
				[rhit.FB_KEY_CURRENTNUM]: this._document.get(rhit.FB_KEY_CURRENTNUM) + 1,
			});
		}
		
	}
}

rhit.teamController = class {
	constructor() {
		rhit.TeamManager.beginListening(this.updateView.bind(this));

		$("#editTeamDialog").on("show.bs.modal", () => {
			document.querySelector("#inputRank").value = rhit.TeamManager.rank;
			document.querySelector("#inputNumber").value = rhit.TeamManager.playNum;
			document.querySelector("#inputStyle").value = rhit.TeamManager.content;
		});
		$("#editTeamDialog").on("shown.bs.modal", () => {
			document.querySelector("#inputRank").focus();
		});
		document.querySelector("#submitEditTeam").onclick = (event) => {
			const rank = document.querySelector("#inputRank").value;
			const number = document.querySelector("#inputNumber").value;
			const content = document.querySelector("#inputStyle").value;
			console.log(rank, number, content);
			rhit.TeamManager.update(content, rank, number);
		};

		document.querySelector("#submitDeleteTeam").onclick = (event) => {
			rhit.TeamManager.delete().then(() => {
				window.location.href = "/teamlist.html"; // Go back to the list of quotes.
			});;
		};
		document.querySelector("#join").onclick = (event) => {
			rhit.TeamManager.addPlayer(rhit.uid);
			window.location.href = `/teamchat.html?id=${rhit.TeamManager.id}`; 
		}

	}
	updateView() {
		document.querySelector("#rankDiv").innerHTML = rhit.TeamManager.rank;
		document.querySelector("#numDiv").innerHTML = rhit.TeamManager.playNum;
		document.querySelector("#contentDiv").innerHTML = rhit.TeamManager.content;
		
		if(rhit.TeamManager.author == rhit.uid){
			document.querySelector("#menuEdit").style.display = "flex";
			document.querySelector("#menuDelete").style.display = "flex";
		}
	}
}

rhit.teamchatController = function(){
	const firebaseConfig = {
		apiKey: "AIzaSyC6WmHvTs0Rktune5L5R588s26RWtpVigY",
		authDomain: "gengh2-project.firebaseapp.com",
		databaseURL: "https://gengh2-project-default-rtdb.firebaseio.com",
		projectId: "gengh2-project",
		storageBucket: "gengh2-project.appspot.com",
		messagingSenderId: "438173460693",
		appId: "1:438173460693:web:cf13ce26da285562415a5c",
		measurementId: "G-B129FPBKKM"
		};
		  
		  // Initialize Firebase
	if (!firebase.apps.length) {
		firebase.initializeApp(firebaseConfig);
	}else {
		firebase.app(); // if already initialized, use that one
	}
	// firebase.initializeApp(firebaseConfig);
	firebase.analytics();
	const db = firebase.database();
	// const app = initializeApp(firebaseConfig);
	// const analytics = getAnalytics(app);
	
	document.getElementById("send-message").addEventListener("submit", postChat);
	function postChat(e) {
	e.preventDefault();
	const timestamp = Date.now();
	const chatTxt = document.getElementById("chat-txt");
	const message = chatTxt.value;
	chatTxt.value = "";
	db.ref("messages/" + rhit.TeamManager.id + "/"+ timestamp).set({
		usr: rhit.uid,
		msg: message,
	});
	}

	const fetchChat = db.ref("messages/" + rhit.TeamManager.id);
	fetchChat.on("child_added", function (snapshot) {
	const messages = snapshot.val();
	const msg = "<div>" + messages.usr + " : " + messages.msg + "</div>";
	document.getElementById("messages").innerHTML += msg;
	});
}

rhit.Highlight = class {
	constructor(id, url, content, topic) {
		this.id = id;
		this.url = url;
		this.content = content;
		this.topic = topic;
	}
}

rhit.highlightListManager = class {
	constructor(uid) {
		this._uid = uid;
		this._documentSnapshots = [];
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_HIGHLIGHT);
	}
	beginListening(changeListener) {
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50);
		if (this._uid){
			query = query.where(rhit.FB_KEY_AUTH, "==", this._uid);
		}
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
				this._documentSnapshots = querySnapshot.docs;
				// Console log for the display for now.
				// querySnapshot.forEach(function (doc) {
				// 	console.log(doc.data());
				// });
				changeListener();
			});
	}
	stopListening() {
		this._unsubscribe();
	}

	add(file, content, topic) {


		// ^ Example from movie quotes users
		// You need to:
		// 1 - Use firebase storage to upload `file` (you will probably need the `async` keyword when making this call, OR you will need to copy your code from below into the `then` for getDownloadURL())
		// 2 - user storageRef.getDownloadURL() to retrieve the public URL
		// 3 - use that public URL when creating the highlight, below
		this._ref.add({
				[rhit.FB_KEY_PHOTOURL]: file,
				[rhit.FB_KEY_CONTENT]: content,
				[rhit.FB_KEY_AUTH]:	 rhit.uid,
				[rhit.FB_KEY_TOPIC]: topic,
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			})
			.then(function (docRef) {
				console.log("Document added with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
	}

	update(id, content, topic) {}
	delete(id) {}
	get length() {
		return this._documentSnapshots.length;
	}
	getHighlightAtIndex(index) {
		const doc = this._documentSnapshots[index];
		return new rhit.Highlight(doc.id, doc.get(rhit.FB_KEY_PHOTOURL), doc.get(rhit.FB_KEY_CONTENT), doc.get(rhit.FB_KEY_TOPIC));
	}
	setUid(uid){
		this._uid = uid;
		console.log(uid);
	}
}

rhit.highlightListController = class {
	constructor() {
		this._url = [];
		document.querySelector("#menuShowMyTeam").addEventListener("click", (event) => {
			window.location.href = `/teamlist.html?uid=${rhit.uid}`;
		});

		document.querySelector("#menuShowMyHighLight").addEventListener("click",(event) => {
			window.location.href = `/highlightlist.html?uid=${rhit.uid}`;
		});

		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			console.log("sign out");
			rhit.LoginManager.signOut();
		});

		rhit.HighlightListManager.beginListening(this.updateList.bind(this));

		$("#addHighlightDialog").on("show.bs.modal", () => {
			document.querySelector("#inputTopic").value = "";
			document.querySelector("#inputFile").value = "";
			document.querySelector("#inputContent").value = "";
		});

		$("#addHighlightDialog").on("shown.bs.modal", () => {
			document.querySelector("#inputTopic").focus();
		});
		document.querySelector("#inputFile").addEventListener("change", (event) => {
			console.log("You selected a file");
			const file = event.target.files[0]
			console.log(`Received file named ${file.name}`);
			const storageRef = firebase.storage().ref().child(rhit.uid);
			storageRef.put(file).then((uploadTaskSnapshot) => {
				console.log("The file has been uploaded!");

				// TODO: save the download url of this photo to the Firestore
				storageRef.getDownloadURL().then((downloadUrl) => {
					this._url = downloadUrl;
				});
			});
			console.log("Uploading the file");
		});
		document.querySelector("#submitAddHighlight").onclick = (event) => {
			const topic = document.querySelector("#inputTopic").value;
			// const file = document.querySelector("#inputFile").value;
			const content = document.querySelector("#inputContent").value;
			rhit.HighlightListManager.add(this._url, content, topic);
			console.log(this._url, content, topic);
			
		};

	}
	updateList() {
		const newList = htmlToElement("<div id='columns'></div>")
		for (let k = 0; k < rhit.HighlightListManager.length; k++) {
			const highlight = rhit.HighlightListManager.getHighlightAtIndex(k);
			const newCard = this._createCard(highlight);
			newCard.onclick = (event) => {
				console.log(` Save the id ${highlight.id} then change pages`);
				window.location.href = `/highlight.html?id=${highlight.id}`;
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#columns");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}

	_createCard(highlight) {
		return htmlToElement(`<div id="${highlight.id}" class="card">
		<div class="card-body">
			<h5 class="card-title">${highlight.topic}</h5>
			<img id="highlightPhoto" src=${highlight.url} alt=${highlight.content}>
			<h6 class="card-subtitle mb-2 text-muted">${highlight.content}</h6>
		</div>
	</div>`);
	}
}

rhit.mainPageController = class {
	constructor() {
		document.querySelector("#menuShowMyTeam").addEventListener("click", (event) => {
			window.location.href = `/teamlist.html?uid=${rhit.uid}`;
		});

		document.querySelector("#menuShowMyHighLight").addEventListener("click",(event) => {
			window.location.href = `/highlightlist.html?uid=${rhit.uid}`;
		});

		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			console.log("sign out");
			rhit.LoginManager.signOut();
		});
		document.querySelector("#findTeam").onclick = (event) => {
			window.location.href = "/teamlist.html";
			console.log("team click");
		};
		document.querySelector("#forum").onclick = (event) => {
			window.location.href = "/highlightlist.html";
			console.log("forum click");
		};
		console.log(rhit.uid);
	}
}

rhit.Team = class {
	constructor(id, content, rank, currentNum, playNum, author) {
		this.id = id;
		this.content = content;
		this.rank = rank;
		this.currentNum =  currentNum;
		this.playNum = playNum;
		this.author = author;
	}
}

rhit.teamListManager = class {
	constructor(uid) {
		this._uid = uid;
		this._documentSnapshots = [];
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_FINDATEAM);
	}
	beginListening(changeListener) {
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(50);
		console.log("uid: ", this._uid);
		if (this._uid){
			query = query.where(rhit.FB_KEY_AUTH, "==", this._uid);
			console.log("have uid");
		}
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
				this._documentSnapshots = querySnapshot.docs;
				console.log("Updated " + this._documentSnapshots.length + " teams.");
				// Console log for the display for now.
				// querySnapshot.forEach(function (doc) {
				// 	console.log(doc.data());
				// });

				if (changeListener) {
					changeListener();
				}

			});
	}
	stopListening() {
		this._unsubscribe();
	}

	add(content, rank, playNum) {
		this._ref.add({
				[rhit.FB_KEY_CONTENT]: content,
				[rhit.FB_KEY_RANK]: rank,
				[rhit.FB_KEY_CURRENTNUM]: 1,
				[rhit.FB_KEY_PLAYNUM]: playNum,
				[rhit.FB_KEY_AUTH]:	 rhit.uid,
				[rhit.FB_KEY_TEAMMEMBER]: [rhit.uid],
				[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			})
			.then(function (docRef) {
				console.log("Document added with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.error("Error adding document: ", error);
			});
	}

	update(id, content, rank, playNum) {}
	delete(id) {}
	get length() {
		return this._documentSnapshots.length;
	}
	getTeamAtIndex(index) {
		const doc = this._documentSnapshots[index];
		return new rhit.Team(doc.id, doc.get(rhit.FB_KEY_CONTENT), doc.get(rhit.FB_KEY_RANK), doc.get(rhit.FB_KEY_CURRENTNUM), doc.get(rhit.FB_KEY_PLAYNUM), doc.get(rhit.FB_KEY_AUTH));
	}
	setUid(uid){
		this._uid = uid;
	}
}

rhit.teamListController = class {
	constructor() {
		document.querySelector("#menuShowMyTeam").addEventListener("click", (event) => {
			window.location.href = `/teamlist.html?uid=${rhit.uid}`;
		});

		document.querySelector("#menuShowMyHighLight").addEventListener("click",(event) => {
			window.location.href = `/highlightlist.html?uid=${rhit.uid}`;
		});
		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			console.log("sign out");
			rhit.LoginManager.signOut();
		});

		rhit.TeamListManager.beginListening(this.updateList.bind(this));

		$("#addTeamDialog").on("show.bs.modal", () => {
			document.querySelector("#inputRank").value = "";
			document.querySelector("#inputNumber").value = "";
			document.querySelector("#inputStyle").value = "";
		});

		$("#addTeamDialog").on("shown.bs.modal", () => {
			document.querySelector("#inputRank").focus();
		});

		document.querySelector("#submitAddTeam").onclick = (event) => {
			const rank = document.querySelector("#inputRank").value;
			const playnum = document.querySelector("#inputNumber").value;
			const content = document.querySelector("#inputStyle").value;
			console.log(rank, playnum, content);
			rhit.TeamListManager.add(content, rank, playnum);
		}
	}
	updateList() {
		//console.log("Update the quotes list on the page.", this);
		const newList = htmlToElement("<div id='teamListContainer'></div>")
		for (let k = 0; k < rhit.TeamListManager.length; k++) {
			const team = rhit.TeamListManager.getTeamAtIndex(k);
			const newCard = this._createCard(team);
			newCard.onclick = (event) => {
				console.log(` Save the id ${team.id} then change pages`);
				// rhit.storage.setMovieQuoteId(movieQuote.id);
				window.location.href = `/team.html?id=${team.id}`;
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#teamListContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}

	_createCard(team) {
		return htmlToElement(`<div id="${team.id}" class="card">
		<div class="card-body">
			<h5 class="card-title">${team.rank}</h5>
			<h6 class="card-subtitle mb-2 text-muted">Needed player number: ${team.currentNum}/${team.playNum}</h6>
			<h6 class="card-subtitle mb-2 text-muted">${team.content}</h6>
		</div>
	</div>`);
	}	
}

rhit.highlightController = class {
	constructor() {
		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			rhit.LoginManager.signOut();
		});
		rhit.HighlightManager.beginListening(this.updateView.bind(this));

		$("#editHighlightDialog").on("show.bs.modal", () => {
			document.querySelector("#inputContent").value = rhit.HighlightManager.content;
		});
		$("#editHighlightDialog").on("shown.bs.modal", () => {
			document.querySelector("#inputContent").focus();
		});
		document.querySelector("#submitEditHighlight").onclick = (event) => {
			const content = document.querySelector("#inputContent").value;
			console.log(content);
			rhit.HighlightManager.update(content);
		};

		document.querySelector("#submitDeleteHighlight").onclick = (event) => {
			rhit.HighlightManager.delete().then(() => {
				window.location.href = "/highlightlist.html"; 
		});;
		};

	}
	updateView() {
		document.querySelector("#highlightPhoto").src = rhit.HighlightManager.photoURL;
		document.querySelector("#topicDiv").innerHTML = rhit.HighlightManager.topic;
		document.querySelector("#ContentDiv").innerHTML = rhit.HighlightManager.content;

		if(rhit.HighlightManager.author == rhit.uid){
			document.querySelector("#menuEdit").style.display = "flex";
			document.querySelector("#menuDelete").style.display = "flex";
		}
	}
}

rhit.highlightManger = class {
	constructor(highlightId) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_HIGHLIGHT).doc(highlightId);
		
	}

	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			console.log("Caption updated ", doc);
			if (doc.exists) {
				this._document = doc;
				changeListener();
			} else {
				console.log("Document does not exist any longer.");
				console.log("CONSIDER: automatically navigate back to the home page.");
			}
		});
	}

	stopListening() {
		this._unsubscribe();
	}

	get photoURL(){
		return this._document.get(rhit.FB_KEY_PHOTOURL);
	}

	get content() {
		return this._document.get(rhit.FB_KEY_CONTENT);
	}

	get topic() {
		return this._document.get(rhit.FB_KEY_TOPIC);
	}

	get author() {
		return this._document.get(rhit.FB_KEY_AUTH);
   }


	update(content) {
		this._ref.update({
			[rhit.FB_KEY_CONTENT]: content,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
		}).then(() => {
			console.log("Document has been updated");
		});
	}
	delete() {
		return this._ref.delete();
	}
}

rhit.startFirebaseUI = function(){
	var uiConfig = {
        signInSuccessUrl: '/main.html',
        signInOptions: [
          // Leave the lines as is for the providers you want to offer your users.
          firebase.auth.GoogleAuthProvider.PROVIDER_ID,
          firebase.auth.EmailAuthProvider.PROVIDER_ID,
          firebase.auth.PhoneAuthProvider.PROVIDER_ID,
          firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
        ],
      };
      rhit.uid = new firebaseui.auth.AuthUI(firebase.auth());
      rhit.uid.start('#firebaseui-auth-container', uiConfig);
}

rhit.checkForRedirects = function(){
	if (document.querySelector("#loginPage") && rhit.LoginManager.isSignedIn) {
		window.location.href = "/main.html";
	}
	if (document.querySelector("#firstPage") && rhit.LoginManager.isSignedIn) {
		window.location.href = "/main.html";
	}
};

rhit.initializePage = function(){
	const urlParams = new URLSearchParams(window.location.search);
	rhit.LoginManager = new rhit.loginManager();
	rhit.LoginManager.beginListening(() => {
		console.log(rhit.LoginManager.isSignedIn);
		rhit.checkForRedirects();

		// MOVE all those if statements in here.  If you call them here, uid will be set
		if (document.querySelector("#firstPage")) {
			console.log("On the first page");
			new rhit.FirstPageController();	
		}
		if (document.querySelector("#loginPage")) {
			console.log("On the login page");
			new rhit.LoginPageController();
		}
		if (document.querySelector("#mainPage")) {
			console.log("On the main page");
			new rhit.mainPageController();
		}
		if (document.querySelector("#teamListPage")) {
			console.log("On the team list page");
			const uid = urlParams.get("uid");
			rhit.TeamListManager = new rhit.teamListManager(uid);
			new rhit.teamListController();
		}
		if (document.querySelector("#teamPage")) {
			console.log("On the team list page");
			const id = urlParams.get("id");
			rhit.TeamManager = new rhit.teamManager(id);
			new rhit.teamController();
		}
		if (document.querySelector("#highlightListPage")) {
			console.log("On the team list page");
			const uid = urlParams.get("uid");
			rhit.HighlightListManager = new rhit.highlightListManager(uid);
			new rhit.highlightListController();
		}
		if (document.querySelector("#highlightPage")) {
			console.log("On the highlight page");
			const id = urlParams.get("id");
			rhit.HighlightManager = new rhit.highlightManger(id);
			new rhit.highlightController();
		}
		if (document.querySelector("#teamchatPage")) {
			console.log("On the team chat page");
			// rhit.TeamchatManager = new rhit.teamchatManger();
			const id = urlParams.get("id");
			rhit.TeamManager = new rhit.teamManager(id);
			new rhit.teamchatController();	
		}
	});	
	
};

rhit.main = function () {
	console.log("Ready");
	rhit.initializePage();

};

rhit.main();
