  fs.writeFile('prisma/data/scheduleBased.json', JSON.stringify(updated), (err) => {
      if(err) console.log(err)

      console.log('ss')
  })