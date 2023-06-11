const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.status(401).send({ error: true, Message: 'unauthorized token' });
	}

	// bearer token
	const token = authorization.split(' ')[1];
	jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
		if (err) {
			res.status(401).send({ error: true, message: 'unauthorized token' });
		}
		req.decoded = decoded;
		next();
	});
};

// console.log(process.env.ACCESS_TOKEN);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const req = require('express/lib/request');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t4pio7r.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();
		// Send a ping to confirm a successful connection
		const usersCollection = client.db('academyDance').collection('users');
		const instructorsCollection = client
			.db('academyDance')
			.collection('instructors');
		const classesCollection = client.db('academyDance').collection('classes');

		// JWT related api
		app.post('/jwt', (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
				expiresIn: '1hr',
			});
			res.send({ token });
		});

		app.get('/instructors', async (req, res) => {
			const result = await instructorsCollection.find().toArray();
			res.send(result);
		});
		app.get('/classes', async (req, res) => {
			const result = await classesCollection.find().toArray();
			res.send(result);
		});

		// admin related api
		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			if (user?.role !== 'admin') {
				return res
					.status(403)
					.send({ error: true, message: 'forbidden message' });
			}
			next();
		};

		// instructor related api
		const verifyInstructor = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			if (user?.role !== 'instructor') {
				return res
					.status(403)
					.send({ error: true, message: 'forbidden message' });
			}
			next();
		};

		// user related api
		app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
			const result = await usersCollection.find().toArray();
			res.send(result);
		});

		app.post('/users', async (req, res) => {
			const users = req.body;
			console.log(users);
			const query = { email: users.email };
			const existingUser = await usersCollection.findOne(query);

			// console.log('existingUser user', existingUser);

			if (existingUser) {
				return res.send({ Message: 'user already exists' });
			}
			const result = await usersCollection.insertOne(users);
			res.send(result);
		});
		// user admin related api

		app.get('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
			const email = req.params.email;
			if (req.decoded.email !== email) {
				res.send({ admin: false });
			}
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			const result = { admin: user?.role === 'admin' };
			res.send(result);
		});

		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedRole = {
				$set: {
					role: 'admin',
				},
			};
			const result = await usersCollection.updateOne(query, updatedRole);
			res.send(result);
		});

		// user instructor related api
		app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
			const email = req.params.email;
			if (req.decoded.email !== email) {
				res.send({ instructor: false });
			}
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			const result = { instructor: user?.role === 'instructor' };
			res.send(result);
		});

		app.patch('/users/instructor/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedRole = {
				$set: {
					role: 'instructor',
				},
			};
			const result = await usersCollection.updateOne(query, updatedRole);
			res.send(result);
		});

		await client.db('admin').command({ ping: 1 });
		console.log(
			'Pinged your deployment. You successfully connected to MongoDB!'
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get('/', (req, res) => {
	res.send('academy of dance art is dancing....');
});

app.listen(port, () => {
	console.log(`academy is dancing server prot : ${port}`);
});
