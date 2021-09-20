import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ProtoGrpcType } from "./proto/random";
import readline from "readline";

const PORT = 8082;
const PROTO_FILE = "./proto/random.proto";

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(
  packageDef
) as unknown as ProtoGrpcType;

const client = new grpcObj.randomPackage.Random(
  `0.0.0.0:${PORT}`,
  grpc.credentials.createInsecure()
);

const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 5);
client.waitForReady(deadline, (err) => {
  if (err) {
    console.error(err);
    return;
  }

  onClientReady();
});

function onClientReady() {
  // unary call
  client.PingPong({ message: "Ping" }, (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(result);
  });

  // client stream
  const stream = client.RandomNumbers({ maxVal: 85 });
  stream.on("data", (chunk) => {
    console.log(chunk);
  });
  stream.on("end", () => {
    console.log("Communication end.");
  });

  // server stream
  const stream2 = client.TodoList((err, result) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(result);
  });
  stream2.write({ todo: "walk the dog", status: "Today" });
  stream2.write({ todo: "get the milk", status: "Tomorrow" });
  stream2.end();

  // bi-directional stream

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const username = process.argv[2];
  if (!username) console.error("No username, cant join chat"), process.exit();
  const metadata = new grpc.Metadata();
  metadata.set("username", username);

  const stream3 = client.Chat(metadata);
  stream3.write({
    message: "register",
  });

  stream3.on("data", (chunk) => {
    console.log(`${chunk.username} ===> ${chunk.message}`);
  });

  rl.on("line", (line) => {
    if (line === "quit") {
      stream3.end();
      return;
    } else {
      stream3.write({
        message: line,
      });
    }
  });
}
