// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import moment from 'moment';
import {debounce} from 'debounce';
import {components, ControlProps} from 'react-select';

import {UserProfile} from 'mattermost-redux/types/users';

import TextWithTooltip from 'src/components/widgets/text_with_tooltip';
import {SortableColHeader} from 'src/components/backstage/incidents/incident_list/sortable_col_header';
import {StatusFilter} from 'src/components/backstage/incidents/incident_list/status_filter';
import SearchInput from 'src/components/backstage/incidents/incident_list/search_input';
import ProfileSelector from 'src/components/profile/profile_selector/profile_selector';
import {PaginationRow} from 'src/components/backstage/incidents/incident_list/pagination_row';
import {FetchIncidentsParams, Incident, IncidentWithDetails} from 'src/types/incident';
import {
    fetchCommandersInTeam,
    fetchIncidents,
    fetchIncident,
    fetchIncidentWithDetails,
} from 'src/client';
import Profile from 'src/components/profile';
import BackstageIncidentDetails from '../incident_details';
import StatusBadge from '../status_badge';

import './incident_list.scss';

const debounceDelay = 300; // in milliseconds
const PER_PAGE = 15;

interface Props {
    currentTeamId: string;
    currentTeamName: string;
    getUser: (userId: string) => UserProfile;
}

export function BackstageIncidentList(props: Props) {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedIncident, setSelectedIncident] = useState<IncidentWithDetails | null>(null);

    const [fetchParams, setFetchParams] = useState<FetchIncidentsParams>(
        {
            team_id: props.currentTeamId,
            page: 0,
            per_page: PER_PAGE,
            sort: 'created_at',
            order: 'desc',
        },
    );

    useEffect(() => {
        setFetchParams({...fetchParams, team_id: props.currentTeamId});
    }, [props.currentTeamId]);

    useEffect(() => {
        async function fetchIncidentsAsync() {
            const incidentsReturn = await fetchIncidents(fetchParams);
            setIncidents(incidentsReturn.incidents);
            setTotalCount(incidentsReturn.total_count);
        }

        fetchIncidentsAsync();
    }, [fetchParams]);

    function setSearchTerm(term: string) {
        setFetchParams({...fetchParams, search_term: term});
    }

    function setStatus(status: string) {
        setFetchParams({...fetchParams, status});
    }

    function setPage(page: number) {
        setFetchParams({...fetchParams, page});
    }

    function colHeaderClicked(colName: string) {
        if (fetchParams.sort === colName) {
            // we're already sorting on this column; reverse the order
            const newOrder = fetchParams.order === 'asc' ? 'desc' : 'asc';
            setFetchParams({...fetchParams, order: newOrder});
            return;
        }

        // change to a new column; default to descending for time-based columns, ascending otherwise
        let newOrder = 'desc';
        if (['name', 'status'].indexOf(colName) !== -1) {
            newOrder = 'asc';
        }
        setFetchParams({...fetchParams, sort: colName, order: newOrder});
    }

    async function fetchCommanders() {
        const commanders = await fetchCommandersInTeam(props.currentTeamId);
        return commanders.map((c) => props.getUser(c.user_id));
    }

    function setCommanderId(userId?: string) {
        setFetchParams({...fetchParams, commander_user_id: userId});
    }

    async function openIncidentDetails(incident: Incident) {
        try {
            const incidentDetails = await fetchIncidentWithDetails(incident.id) as Incident;
            setSelectedIncident(incidentDetails);
        } catch (e) {
            const incidentWithoutDetails = await fetchIncident(incident.id) as Incident;
            setSelectedIncident(incidentWithoutDetails);
        }
    }

    const closeIncidentDetails = () => {
        setSelectedIncident(null);
    };

    const [profileSelectorToggle, setProfileSelectorToggle] = useState(false);
    const ControlComponent = (ownProps: ControlProps<any>) => {
        const resetLink = fetchParams.commander_user_id && (
            <a
                className='IncidentFilter-reset'
                onClick={() => {
                    setCommanderId();
                    setProfileSelectorToggle(!profileSelectorToggle);
                }}
            >
                {'Reset to all commanders'}
            </a>
        );

        return (
            <div>
                <components.Control {...ownProps}/>
                {resetLink}
            </div>
        );
    };

    const isFiltering = (
        fetchParams.search_term ||
        fetchParams.commander_user_id ||
        (fetchParams.status && fetchParams.status !== 'all')
    );

    return (
        <>
            {!selectedIncident && (
                <div className='IncidentList'>
                    <div className='Backstage__header'>
                        <div className='title'>
                            {'Incidents'}
                            <div className='light'>
                                {'(' + props.currentTeamName + ')'}
                            </div>
                        </div>
                    </div>
                    <div className='list'>
                        <div className='IncidentList__filters'>
                            <SearchInput
                                default={fetchParams.search_term}
                                onSearch={debounce(setSearchTerm, debounceDelay)}
                            />
                            <ProfileSelector
                                commanderId={fetchParams.commander_user_id}
                                enableEdit={true}
                                isClearable={true}
                                customControl={ControlComponent}
                                controlledOpenToggle={profileSelectorToggle}
                                getUsers={fetchCommanders}
                                onSelectedChange={setCommanderId}
                            />
                            <StatusFilter
                                default={fetchParams.status}
                                onChange={setStatus}
                            />
                        </div>
                        <div className='Backstage-list-header'>
                            <div className='row'>
                                <div className='col-sm-3'>
                                    <SortableColHeader
                                        name={'Name'}
                                        order={fetchParams.order ? fetchParams.order : 'desc'}
                                        active={fetchParams.sort ? fetchParams.sort === 'name' : false}
                                        onClick={() => colHeaderClicked('name')}
                                    />
                                </div>
                                <div className='col-sm-2'>
                                    <SortableColHeader
                                        name={'Status'}
                                        order={fetchParams.order ? fetchParams.order : 'desc'}
                                        active={fetchParams.sort ? fetchParams.sort === 'status' : false}
                                        onClick={() => colHeaderClicked('status')}
                                    />
                                </div>
                                <div className='col-sm-2'>
                                    <SortableColHeader
                                        name={'Start Time'}
                                        order={fetchParams.order ? fetchParams.order : 'desc'}
                                        active={fetchParams.sort ? fetchParams.sort === 'created_at' : false}
                                        onClick={() => colHeaderClicked('created_at')}
                                    />
                                </div>
                                <div className='col-sm-2'>
                                    <SortableColHeader
                                        name={'End Time'}
                                        order={fetchParams.order ? fetchParams.order : 'desc'}
                                        active={fetchParams.sort ? fetchParams.sort === 'ended_at' : false}
                                        onClick={() => colHeaderClicked('ended_at')}
                                    />
                                </div>
                                <div className='col-sm-3'> {'Commander'} </div>
                            </div>
                        </div>

                        {
                            !incidents.length && !isFiltering &&
                            <div className='text-center pt-8'>
                                {'There are no incidents for '}
                                <i>{props.currentTeamName}</i>
                                {'.'}
                            </div>
                        }
                        {
                            !incidents.length && isFiltering &&
                            <div className='text-center pt-8'>
                                {'There are no incidents for '}
                                <i>{props.currentTeamName}</i>
                                {' matching those filters.'}
                            </div>
                        }

                        {
                            incidents.map((incident) => (
                                <div
                                    className='row incident-item'
                                    key={incident.id}
                                    onClick={() => openIncidentDetails(incident)}
                                >
                                    <TextWithTooltip
                                        id={incident.id}
                                        text={incident.name}
                                        className='col-sm-3 incident-item__title'
                                    />
                                    <div className='col-sm-2'>
                                        <StatusBadge isActive={incident.is_active}/>
                                    </div>
                                    <div
                                        className='col-sm-2'
                                    >
                                        {
                                            moment.unix(incident.created_at).format('MMM DD LT')
                                        }
                                    </div>
                                    <div className='col-sm-2'>
                                        {
                                            endedAt(incident.is_active, incident.ended_at)
                                        }
                                    </div>
                                    <div className='col-sm-3'>
                                        <Profile userId={incident.commander_user_id}/>
                                    </div>
                                </div>
                            ))
                        }
                        <PaginationRow
                            page={fetchParams.page ? fetchParams.page : 0}
                            perPage={fetchParams.per_page ? fetchParams.per_page : PER_PAGE}
                            totalCount={totalCount}
                            setPage={setPage}
                        />
                    </div>
                </div>
            )}
            {
                selectedIncident &&
                <BackstageIncidentDetails
                    incident={selectedIncident}
                    onClose={closeIncidentDetails}
                />
            }
        </>
    );
}

const endedAt = (isActive: boolean, time: number) => {
    if (isActive) {
        return '--';
    }

    const mom = moment.unix(time);
    if (mom.isSameOrAfter('2020-01-01')) {
        return mom.format('MMM DD LT');
    }
    return '--';
};
