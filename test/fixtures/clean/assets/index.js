import { getTossShareLink, share } from '@apps-in-toss/web-framework';
export async function invite(code) { const link = await getTossShareLink(`intoss://my-app?invite=${code}`); await share({ message: link }); }
const props = { onDoubleClick: () => {}, evaluate: x => x };
fetch('https://api.my-app.example/v1/items');
