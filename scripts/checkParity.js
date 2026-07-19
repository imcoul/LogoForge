import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Add other config if needed
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_PUBLIC_KEY || '');

async function computeHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function checkParity() {
  console.log('Fetching projects from Firestore...');
  const firestoreSnapshot = await getDocs(collection(db, 'projects'));
  const firestoreProjects = firestoreSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  firestoreProjects.sort((a, b) => a.id.localeCompare(b.id));

  console.log('Fetching projects from Supabase...');
  const { data: supabaseProjects, error } = await supabase.from('projects').select('*');
  if (error) throw error;
  supabaseProjects.sort((a, b) => a.id.localeCompare(b.id));

  console.log('Computing hashes...');
  const firestoreHash = await computeHash(firestoreProjects);
  const supabaseHash = await computeHash(supabaseProjects);

  console.log(`Firestore Hash: ${firestoreHash}`);
  console.log(`Supabase Hash: ${supabaseHash}`);

  if (firestoreHash !== supabaseHash) {
    console.error('Parity check failed: Hashes do not match!');
    process.exit(1);
  } else {
    console.log('Parity check passed: Hashes match.');
    process.exit(0);
  }
}

checkParity().catch(err => {
  console.error(err);
  process.exit(1);
});
