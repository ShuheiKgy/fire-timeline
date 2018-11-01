async function initAuth() {
  const auth = firebase.auth();

  const $authButton = document.getElementById('auth-button');
  const $app = document.getElementById("app");
  const $load = document.getElementById("load");

  let loaded = false;
  let loginUser = null;
  auth.onAuthStateChanged(user => {
    if(!loaded) {
      loaded = true;
      $load.style.display = 'none';
      $app.style.display = '';
    }
    console.log('@@@', user);

    loginUser = user;
    if (user) {
      $authButton.innerText = 'Logout';
    } else {
      $authButton.innerText = 'Login';
    }
  });

  $authButton.addEventListener('click', () => {
    if (loginUser) {
      auth.signOut();
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
  });

  try {
    const result = await auth.getRedirectResult();
    // const token = result.credential.accessToken;
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
}

async function initPost() {
  const auth = firebase.auth();
  const db = firebase.firestore();

  const $postBox = document.getElementById('post-box');
  const $post = document.getElementById('post');
  const $postButton = document.getElementById('post-button');

  const user = auth.currentUser;
  const userRef = db.collection('users').doc(user.uid);

  async function updateUserTL() {
      const id = getProfilePageId();
      if ((id || user.uid) !== user.uid) {
          $postBox.style.display = 'none';
          try {
              const user = await db.collection('users').doc(id).get();
              const data = user.data();
              if (!data) {
                  location.href = '/404.html';
              }
              const profile = Object.assign({ uid: id }, data);
              updateProfile(profile);
          } catch (err) {
              console.warn(err);
              location.href = '/404.html';
              return
          }
      } else {
          $postBox.style.display = '';
          updateProfile(user);
      }
  }

  await updateUserTL();

  window.addEventListener('hashchange', async () => {
      await updateUserTL();
  });

  $postButton.addEventListener('click', async () => {
      // 二重投稿の予防
      $post.disabled = true;
      $postButton.disabled = true;
      const text = $post.value;
      const postRef = userRef.collection('timeline').doc();
      try {
          await postRef.set({
              uid: user.uid,
              text,
              created: firebase.firestore.FieldValue.serverTimestamp()
          });
      } catch (err) {
          showError(err);
      } finally {
          $post.value = ''; // clear
          $post.disabled = false;
          $postButton.disabled = false;
      }
  });
}

async function createPostEl(doc) {
  const db = doc.ref.firestore
  const data = doc.data();
  const userRef = db.collection('users').doc(data.uid);
  const tmpl = document.querySelector('#post-template');
  const $el = document.importNode(tmpl.content, true);
  const $container = $el.querySelector('div');

  $container.id = 'post-' + doc.id;

  const profileSnap = await userRef.get();
  const profile = profileSnap.data();

  const $name = $el.querySelector('.name');
  $name.innerText = profile.name || '';
  $name.href = `#${profileSnap.id}`

  const $icon = $el.querySelector('.icon');
  $icon.src = profile.photoURL;

  const $text = $el.querySelector('.text');
  if (data.text) {
      $text.innerText = data.text;
  }

  const $time = $el.querySelector('.time');
  let created = new Date();
  if (data.created) {
      created = data.created.toDate();
  }
  $time.innerText = `${created.getFullYear()}/${created.getMonth() + 1}/${created.getDate()} ${created.getHours()}:${created.getMinutes()}`;
  $container.dataset.created = created.getTime();

  return $el;
}

function getProfilePageId() {
  const hash = location.hash;
  if (!hash) {
      return;
  }
  return hash.slice(1)
}

async function main() {
  await initAuth();
}

document.addEventListener('DOMContentLoaded', function() {
  main().catch(err => console.error(err));
});