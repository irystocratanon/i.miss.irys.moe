import getResult from "../../server/poller.js"

export default async function(req, res) {
    const {error,result,pastStream} = await getResult()
    const json = {
        live: result.live,
        title: result.title || pastStream.title
    }
    return res.status(200).json(json)
}
