import BullMQRouter from "../../luffy/ext/bullmq/routes";
import MyHandler from "./handlers";

const routers = [
    new BullMQRouter("myQueue", MyHandler, "queueName")
];

export default routers;
