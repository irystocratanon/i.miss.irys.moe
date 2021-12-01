import Script from "next/script"
import { pollPaststreamStatus, pollPaststreamStatusDummy } from "../server/paststream_poller"
import { STREAM_STATUS } from "../server/livestream_poller"

export async function getPastStream() {
    let pastStream 
    if (process.env.USE_DUMMY_DATA === "true") {
        pastStream = await pollPaststreamStatusDummy(process.env.WATCH_CHANNEL_ID)
	} else {
		pastStream = await pollPaststreamStatus(process.env.WATCH_CHANNEL_ID)
    }

    return pastStream
}

export function CountdownTimer(props) {
    const {status,pastStream} = props;
    if (status !== STREAM_STATUS.OFFLINE) { return <></>; }
    return  <>
			    <div id="timer" data-past-stream={JSON.stringify(pastStream)}></div>
                <Script defer src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js" integrity="sha512-qTXRIMyZIFb8iQcfjXWCO8+M5Tbc38Qi5WzdPOYZHIlZpzBHG3L3by84BBBOiRGiEb7KKtAOAs5qYdUiZiQNNQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></Script>
		        <Script defer src="https://cdnjs.cloudflare.com/ajax/libs/countdown/2.6.0/countdown.min.js" integrity="sha512-FkM4ZGExuYz4rILLbNzw8f3HxTN9EKdXrQYcYfdluxJBjRLthYPxxZixV/787qjN3JLs2607yN5XknR/cQMU8w==" crossorigin="anonymous" referrerpolicy="no-referrer"></Script>
		        <Script defer id="past-stream-countdown">
		        	{
		        	setInterval(() => {
		        			try {
		        				const timer = document.getElementById('timer');
		        			}
		        			catch (e) {
		        				clearInterval(this);
		        				return;
		        			}
		        			if (!timer) { clearInterval(this); return; }
		        			if (document.getElementsByClassName('miss-her').length < 1) {
		        				clearInterval(this);
		        				return;
		        			}
		        			try {
                                const ts = JSON.parse(document.getElementById('timer').attributes['data-past-stream'].textContent).end_actual;
                                timer.innerHTML = countdown(moment(ts).toDate()).toString() + " without IRyS"
		        			} catch (e) {
		        				timer.innerHTML='';
		        				return;
		        			}
		        		}, 500)
		        	}
                </Script>
        </>
}
