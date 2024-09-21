// import { Container } from "dockerode";

// export const execCmdInContainer = async (container: Container, command: string) => {
//   const exec = await container.exec({
//     Cmd: ["sh", "-c", command],
//     AttachStdout: true,
//     AttachStderr: true,
//   });

//   const stream = await exec.start({});

//   let output = '';
//   try {
//     for await (const chunk of stream) {
//       output += chunk.toString();
//     }
//   } catch (err) {
//     throw err;
//   }

//   return output.trim();
// }