export const handleMongoCommand = ({ command, port }: { command: string, port: string }) => {
  if (command.includes('insertone')) {
    command = command.replace("insertone", "insertOne")
  }
  return ["mongosh", "--host", "localhost", "--port", port, "--eval", command]
}