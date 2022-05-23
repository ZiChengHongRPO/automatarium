import dayjs from 'dayjs'
import { styled } from 'goober'

import { Logo } from '/src/components'

// Extend dayjs
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const ProjectCard = ({ name, type, date, ...props }) =>
  <CardContainer {...props}>
    <CardImage>
      <Logo />
      <TypeBadge>{type}</TypeBadge>
    </CardImage>
    <CardDetail>
      <strong>{name}</strong>
      <span>{dayjs().to(date)}</span>
    </CardDetail>
  </CardContainer>

const CardContainer = styled('div')`
  width: 12em;
  margin: 3px;

  ${p => !p.$disabled && `
    cursor: pointer;
    &:hover > div:first-of-type {
      border: 3px solid var(--primary);
    }
  `}
`

const TypeBadge = styled('div')`
  position: absolute;
  top: 0;
  right: 0;
  background: var(--toolbar);
  margin-right: .5em;
  margin-top: .5em;
  padding: .3em;
  padding-inline: .5em;
  border-radius: .4em;
  letter-spacing: .2ch;
  font-size: .9rem;
  color: var(--white);
`

const CardDetail = styled('div')`
  display: flex;
  flex-direction: column;
  margin-block-start: 1em;
  gap: .2em;

  span {
    opacity: .5;
  }
`

const CardImage = styled('div')`
  aspect-ratio: 1;  
  border-radius: .5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 3px solid transparent;

  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 7rem;
    height: 7rem;
    filter: drop-shadow(0px 3px 0px #BBB);
  }

  /* TODO: use image in place of temp background */
  --dot-fraction: 12.5%;
  background: radial-gradient(
    var(--grid-dot),
    var(--grid-dot) var(--dot-fraction),
    var(--white) var(--dot-fraction));
  background-size: 30px 30px;
  background-position: 5px 5px;
`

export default ProjectCard
