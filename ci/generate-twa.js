// Genera el proyecto Android (Trusted Web Activity) a partir del manifest.json
// publicado en GitHub Pages, sin prompts interactivos, para correr dentro de
// GitHub Actions. Requiere que ~/.bubblewrap/config.json ya tenga jdkPath y
// androidSdkPath configurados (ver .github/workflows/build-apk.yml) y que
// BUBBLEWRAP_KEYSTORE_PASSWORD / BUBBLEWRAP_KEY_PASSWORD estén en el entorno
// para crear la llave de firma la primera vez.

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const {
  TwaManifest,
  TwaGenerator,
  KeyTool,
  JdkHelper,
  Config,
  ConsoleLog,
} = require("@bubblewrap/core");

const MANIFEST_URL = process.env.PWA_MANIFEST_URL || "https://keiner12-gro.github.io/niveles-aceite/manifest.json";
const PACKAGE_ID = process.env.TWA_PACKAGE_ID || "org.nivelesaceite.app";
const APP_VERSION_CODE = Number(process.env.APP_VERSION_CODE || "1");

async function main() {
  const targetDirectory = path.resolve(__dirname, "..", "android");
  fs.mkdirSync(targetDirectory, { recursive: true });

  const log = new ConsoleLog("generate-twa");

  log.info(`Leyendo manifest desde ${MANIFEST_URL}`);
  const twaManifest = await TwaManifest.fromWebManifest(MANIFEST_URL);

  twaManifest.packageId = PACKAGE_ID;
  twaManifest.name = "Niveles de Aceite";
  twaManifest.launcherName = "Niveles Aceite";
  twaManifest.appVersionCode = APP_VERSION_CODE;
  twaManifest.appVersionName = process.env.APP_VERSION_NAME || String(APP_VERSION_CODE);
  twaManifest.signingKey.path = path.join(targetDirectory, "android.keystore");
  twaManifest.signingKey.alias = "nivelesaceite";

  const manifestFile = path.join(targetDirectory, "twa-manifest.json");
  await twaManifest.saveToFile(manifestFile);

  const twaGenerator = new TwaGenerator();
  await twaGenerator.createTwaProject(targetDirectory, twaManifest, log);

  const manifestContents = fs.readFileSync(manifestFile);
  const checksum = crypto.createHash("sha1").update(manifestContents).digest("hex");
  fs.writeFileSync(path.join(targetDirectory, "manifest-checksum.txt"), checksum);

  if (process.env.SKIP_SIGNING_KEY === "1") {
    log.info("SKIP_SIGNING_KEY=1: se omite la creación de la llave de firma (prueba local sin JDK).");
    return;
  }

  if (!fs.existsSync(twaManifest.signingKey.path)) {
    const configPath = path.join(os.homedir(), ".bubblewrap", "config.json");
    const config = await Config.loadConfig(configPath);
    const jdkHelper = new JdkHelper(process, config);
    const keytool = new KeyTool(jdkHelper, log);
    await keytool.createSigningKey({
      fullName: "Planta de Extraccion",
      organizationalUnit: "Mantenimiento",
      organization: "Planta de Extraccion",
      country: "CO",
      password: process.env.BUBBLEWRAP_KEYSTORE_PASSWORD,
      keypassword: process.env.BUBBLEWRAP_KEY_PASSWORD,
      alias: twaManifest.signingKey.alias,
      path: twaManifest.signingKey.path,
    });
  }

  log.info(`Proyecto Android generado en ${targetDirectory}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
