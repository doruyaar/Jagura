how to install curl on alpine: apk add --no-cache curl


dbz api vegita: 

curl -s https://dragonball-api.com/api/characters/2

mongo:

use mydatabase
db.users.insertOne({name: 'Dor', age: 34})
db.users.insertOne({name: 'Hadar', age: 24})
db.users.find({name: 'Dor'})