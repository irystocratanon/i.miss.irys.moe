#!/bin/sh

get_timestamps() {
	if [ -n "$1" ] && [ -f "$1" ]
	then
		cat "$1"
	else
		if [ -n "$WAYLAND_DISPLAY" ]
		then
			wl-paste
		elif [ -n "$DISPLAY" ]
		then
			xclip -o
		else
			exit 1
		fi
	fi
}

format_ts() {
	has_hours=0
	if [ "$(echo "$1" | grep -ohE ':' | wc -l)" -gt 1 ]
	then
		has_hours=1
		set -- $(echo "$1" | dconv -f '%H %M %S')
	else
		set -- $(echo "0:$1" | dconv -f '%M %S')
	fi
	if [ "$has_hours" -eq 1 ]
	then
		echo "${1}h${2}m${3}s"
	else
		echo "${1}m${2}s"
	fi
}

format_keywords() {
	echo "$*" | grep -ohE '[a-zA-Z]+' | tr 'A-Z' 'a-z' | xargs
}

format_title() {
	has_artist=0
	if [ "$(echo "$*" | grep -ohE ' - ' | wc -l)" -gt 0 ]
	then
		has_artist=1
		title="$(printf "%s" "$*" | sed -e 's/^\s+//g' -e 's/^-//g')"
		artist="${title##* - }"
		title="$(echo "${title}" | awk -F' - ' '{print $1}')"
		printf "\"%s\",\n  artist: \"%s\"" "${title}" "${artist}"
	else
		printf "\"%s\"" "$*"
	fi
}

printf "[\n"
first=1
get_timestamps "$@" | grep -v -E '^$' | while read -r line
do
	set -- $(echo "$line")
	ts="$1"
	shift 2
	[ "${first}" -eq 1 ] || _first=",\n"
	printf "${_first}{\n"
	printf "  timestamp: \"%s\",\n  title: %s,\n  keywords: \"%s\"\n" "$(format_ts "$ts")" "$(format_title "$*")" "$(format_keywords "$*")"
	printf "}"
	[ "${first}" -eq 1 ] && first=0
done
printf "\n]\n"
