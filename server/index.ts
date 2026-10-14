import { createApp } from "./app.js";
import { DATABASE_PATH, SERVER_PORT, UPLOAD_DIRECTORY } from "./config.js";
import { JsonDataRepository } from "./repositories/dataRepository.js";
import { ArtilearnService } from "./services/artilearnService.js";

const repository = new JsonDataRepository(DATABASE_PATH, UPLOAD_DIRECTORY);
const app = createApp(new ArtilearnService(repository));

app.listen(SERVER_PORT, "127.0.0.1", () => {
  console.log(`Artilearn API listening on http://127.0.0.1:${SERVER_PORT}`);
});
