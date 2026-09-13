import { Client } from './client'
import { Merged } from './merged'

export default function Page() {
    return (
        <main>
            <Merged id="server" />
            <Client />
        </main>
    )
}
