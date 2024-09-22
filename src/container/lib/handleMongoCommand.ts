export const handleMongoCommand = ({ command, port }: { command: string, port: number }) => {
  if (command.includes('insertone')) {
    command = command.replace("insertone", "insertOne")
  }
  return ["mongosh", "--host", "localhost", "--port", port.toString() , "--eval", command]
}