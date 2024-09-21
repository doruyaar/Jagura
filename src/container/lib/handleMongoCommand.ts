export const handleMongoCommand = (command: string) => {
  if (command.includes('insertone')) {
    command = command.replace("insertone", "insertOne")
  }
  return ["mongosh", "--host", "localhost", "--port", "27017", "--eval", command]
}