const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.port || 5000;
const morgan = require("morgan");

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.pmlso.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const db = client.db("Edu-Manager");
        const userCollection = db.collection("user");
        const classCollection = db.collection("class");
        const feedBackCollection = db.collection("feedback");
        const techOnCollection = db.collection("techOn");
        const enrollmentCollection = db.collection("enrollment"); // ✅ consistent naming
        const assignmentCollection = db.collection("assignment");
        const submissionCollection = db.collection("submission");

        // add new User
        app.post("/users/:email", async (req, res) => {
            const email = req.params.email;
            const userData = req.body;
            const query = { email: email };
            const isExist = await userCollection.findOne(query);
            if (isExist) {
                return res.send(isExist);
            }
            const result = await userCollection.insertOne({
                ...userData,
                role: "student",
                timestamp: Date.now(),
            });
            res.send(result);
        });

        app.get("/user", async (req, res) => {
            const search = req.query.search || "";

            let query = {};
            if (search.trim()) {
                query = {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } },
                    ],
                };
            }

            try {
                const users = await userCollection.find(query).toArray();
                res.send(users);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        // get user role
        app.get("/users/role/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send({ role: result?.role });
        });
        // get my class
        app.get("/myClass/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await classCollection.find(query).toArray();
            res.send(result);
        });
        // Get All Classes
        app.get("/class", async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        });
        // Get accepted All Classes
        app.get("/acceptedClass", async (req, res) => {
            const query = {status:"accepted"}
            const result = await classCollection.find(query).toArray();
            res.send(result);
        });
        // Get Specific Classes by id
        app.get("/class/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }; // ✅ Correct usage
            const result = await classCollection.findOne(query);
            res.send(result);
        });
        // get all enrollments
        app.get("/enrollments", async (req, res) => {
            const result = await enrollmentCollection.find().toArray();
            res.send(result);
        });

        // Get all enrollments for a student
        app.get("/enroll/:email", async (req, res) => {
            const email = req.params.email;
            const result = await enrollmentCollection
                .find({ studentEmail: email })
                .toArray();
            res.send(result);
        });
        // get my assignment
        app.get("/assignments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.findOne(query);
            res.send(result);
        });
        // Get all assignments by classId
        app.get("/assignments/class/:classId", async (req, res) => {
            const classId = req.params.classId;
            const result = await assignmentCollection
                .find({ classId })
                .toArray();
            res.send(result); // ✅ must be an array
        });

        // ------------------- get for count ---------------------
        app.get("/enrollments/count/:classId", async (req, res) => {
            const classId = req.params.classId;
            const count = await enrollmentCollection.countDocuments({
                classId,
            });
            res.send({ count });
        });
        app.get("/assignments/count/:classId", async (req, res) => {
            const classId = req.params.classId;
            const count = await assignmentCollection.countDocuments({
                classId,
            });
            res.send({ count });
        });
        app.get("/submissions/count/:classId", async (req, res) => {
            const classId = req.params.classId;
            const count = await submissionCollection.countDocuments({
                classId,
            });
            res.send({ count });
        });
        // get feedback
        app.get("/feedback", async (req, res) => {
            const result = await feedBackCollection.find().toArray();
            res.send(result);
        });
        // app.js or server.js

        // add class
        app.post("/class", async (req, res) => {
            const classData = req.body;
            const classDataWithStatus = {
                ...classData,
                status: "pending",
            };
            const result = await classCollection.insertOne(classDataWithStatus);
            res.send(result);
        });
        // Add FeedBack
        app.post("/feedback", async (req, res) => {
            const feedBackData = req.body;
            const result = await feedBackCollection.insertOne(feedBackData);
            res.send(result);
        });
        app.post("/techOn", async (req, res) => {
            const techData = req.body;
            const techDataWithStatus = {
                ...techData,
                status: "pending",
            };
            const result = await techOnCollection.insertOne(techDataWithStatus);
            res.send(result);
        });
        app.post("/enroll", async (req, res) => {
            const enrollment = req.body;
            const { classId, studentEmail } = enrollment;

            // Prevent duplicate enrollment
            const alreadyEnrolled = await enrollmentCollection.findOne({
                classId,
                studentEmail,
            });
            if (alreadyEnrolled) {
                return res.status(400).send({ message: "Already enrolled" });
            }

            const result = await enrollmentCollection.insertOne(enrollment);

            // Increment enrolled count in class
            await classCollection.updateOne(
                { _id: new ObjectId(classId) },
                { $inc: { enrolled: 1 } }
            );

            res.send(result);
        });

        // create new assignment
        // Create new assignment
        app.post("/assignments", async (req, res) => {
            try {
                const { title, deadline, description, classId } = req.body;

                if (!title || !deadline || !description || !classId) {
                    return res
                        .status(400)
                        .send({ message: "Missing required fields" });
                }

                const newAssignment = {
                    title,
                    deadline,
                    description,
                    classId,
                    createdAt: new Date(),
                };

                const result = await assignmentCollection.insertOne(
                    newAssignment
                );
                res.send(result);
            } catch (err) {
                console.error("Failed to create assignment:", err);
                res.status(500).send({ message: "Server error" });
            }
        });
        // assignment submission
        app.post("/submit-assignment", async (req, res) => {
            try {
                const { assignmentId, submissionText, submissionEmail } =
                    req.body;
                if (!assignmentId || !submissionText) {
                    return res.status(400).send({
                        message: "assignmentId and submissionText are required",
                    });
                }

                // Optional: You might want to get user info from req (e.g. user email/id if authenticated)
                // For now, let's assume we just store the assignmentId, submissionText, and timestamp

                // Fetch the assignment to get classId for easier query later
                const assignment = await assignmentCollection.findOne({
                    _id: new ObjectId(assignmentId),
                });
                if (!assignment) {
                    return res
                        .status(404)
                        .send({ message: "Assignment not found" });
                }

                const submissionData = {
                    assignmentId: new ObjectId(assignmentId),
                    submissionEmail,
                    classId: assignment.classId, // assuming classId is stored in the assignment document as string
                    submissionText,
                    submittedAt: new Date(),
                    // you can add user info here if available, e.g. userEmail: req.user.email
                };

                // Insert submission into submission collection
                const result = await submissionCollection.insertOne(
                    submissionData
                );

                // Optionally, increment submission count for the assignment (if you want)
                // await assignmentCollection.updateOne(
                //     { _id: new ObjectId(assignmentId) },
                //     { $inc: { submissionCount: 1 } }
                // );

                res.send({
                    message: "Assignment submitted successfully",
                    submissionId: result.insertedId,
                });
            } catch (error) {
                console.error("Error submitting assignment:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });

        app.get("/teacher-requests", async (req, res) => {
            const result = await techOnCollection.find().toArray();
            res.send(result);
        });

        // update a class
        app.put("/class/:id", async (req, res) => {
            const updatedClass = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updatedClass,
            };
            const result = await classCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        app.patch("/teacher-status/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const doc = req.body;
            const updateDoc = {
                $set: doc,
            };
            const result = await techOnCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // update role
        app.patch("/updateRole/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const doc = req.body;
            const updateDoc = {
                $set: doc,
            };
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        app.patch("/users/admin/:id", async (req, res) => {
            const userId = req.params.id;
            const filter = { _id: new ObjectId(userId) };
            const updateDoc = {
                $set: { role: "admin" },
            };
            const result = await userCollection.updateOne(filter, updateDoc); // <-- usersCollection ???
            res.send(result);
        });

        app.delete("/class/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.deleteOne(query);
            res.send(result);
        });

        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Basic NextClass Server is Running");
});

app.listen(port, () => {
    console.log("NextClass running on Port : ", port);
});
